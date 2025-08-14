#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or key. Ensure .env.local has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const CONFIG = {
  NUM_SUPPLIERS: 20,
  NUM_PRODUCTS: 200,
  MIN_BATCHES_PER_PRODUCT: 2,
  MAX_BATCHES_PER_PRODUCT: 6,
  NUM_SALES: 1200,
  MIN_ITEMS_PER_SALE: 1,
  MAX_ITEMS_PER_SALE: 5,
  LOW_STOCK_THRESHOLD: 50,
  START_DAYS_AGO: 90,
};

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randChoice(list) {
  return list[randInt(0, list.length - 1)];
}
function randDateWithinDays(daysBack) {
  const now = new Date();
  const past = new Date(now);
  past.setDate(now.getDate() - randInt(0, daysBack));
  past.setHours(randInt(8, 20), randInt(0, 59), randInt(0, 59), 0);
  return past.toISOString();
}

const GENERICS = [
  'Paracetamol','Amoxicillin','Ibuprofen','Cetirizine','Dextromethorphan','Azithromycin','Metformin',
  'Omeprazole','Amoxiclav','Diclofenac','Loratadine','Amlodipine','Losartan','Atorvastatin','Co-trimoxazole',
  'Ciprofloxacin','Salbutamol','Fluconazole','Metronidazole','Vitamin C'
];

const BRANDS = [
  'Panadol','Brufen','Augmentin','Robitussin','Azomax','Glucophage','Losec','Voltaren','Claritin',
  'Norvasc','Cozaar','Lipitor','Bactrim','Cipro','Ventolin','Diflucan','Flagyl','Sandoz','GSK','Pfizer'
];

const FORMS = ['tablet', 'capsule', 'syrup', 'injection', 'cream', 'ointment', 'drops', 'inhaler'];
const UNITS = ['100mg','200mg','250mg','400mg','500mg','5mg/5ml','100ml','250ml'];

function makeSku(gen, unit) {
  const g = gen.replace(/[^A-Z]/gi, '').slice(0, 4).toUpperCase().padEnd(4, 'X');
  const u = unit.replace(/[^0-9]/g, '');
  return `${g}${u || randInt(10, 999)}`;
}

async function chunkedInsert(table, rows, chunkSize = 500, selectCols = 'id') {
  const out = [];
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { data, error } = await supabase.from(table).insert(chunk).select(selectCols);
    if (error) throw error;
    out.push(...data);
  }
  return out;
}

async function chunkedUpdate(table, rows, keyField = 'id', chunkSize = 500) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const promises = chunk.map(row =>
      supabase.from(table).update(row).eq(keyField, row[keyField])
    );
    const results = await Promise.all(promises);
    results.forEach(({ error }) => { if (error) throw error; });
  }
}

async function main() {
  console.log('Seeding large dataset...');

  const { data: pharmacies, error: phErr } = await supabase
    .from('pharmacies').select('id').limit(1);
  if (phErr || pharmacies.length === 0) throw phErr || new Error('No pharmacy found');
  const pharmacyId = pharmacies[0].id;

  const { data: profiles, error: prErr } = await supabase
    .from('profiles').select('id, role').eq('pharmacy_id', pharmacyId).limit(1);
  if (prErr || profiles.length === 0) throw prErr || new Error('No profile found for pharmacy');
  const cashierId = profiles[0].id;

  console.log('Creating suppliers...');
  const suppliersPayload = Array.from({ length: CONFIG.NUM_SUPPLIERS }, (_, i) => ({
    pharmacy_id: pharmacyId,
    name: `Supplier ${i + 1} — ${randChoice(BRANDS)}`,
    contact: `+2547${randInt(10000000, 99999999)}`,
    lead_time_days: randInt(3, 14),
    min_order: randInt(2000, 20000),
  }));
  const suppliers = await chunkedInsert('suppliers', suppliersPayload, 500, 'id');

  console.log('Creating products...');
  const usedSkus = new Set();
  const productsPayload = Array.from({ length: CONFIG.NUM_PRODUCTS }, () => {
    const generic = randChoice(GENERICS);
    const brand = randChoice(BRANDS);
    const form = randChoice(FORMS);
    const unit = randChoice(UNITS);
    let sku = makeSku(generic, unit);
    while (usedSkus.has(sku)) sku = `${sku}${randInt(1, 9)}`;
    usedSkus.add(sku);
    return {
      pharmacy_id: pharmacyId,
      sku,
      generic_name: generic,
      brand,
      form,
      unit,
      barcode: String(randInt(1000000000000, 9999999999999)),
      sell_price: randInt(10, 500),
      tax_code: null,
      active: true,
    };
  });
  const products = await chunkedInsert('products', productsPayload, 500, 'id,sku,sell_price');

  console.log('Creating batches...');
  const batchesPayload = [];
  const productToBatches = new Map();
  for (const p of products) {
    const k = randInt(CONFIG.MIN_BATCHES_PER_PRODUCT, CONFIG.MAX_BATCHES_PER_PRODUCT);
    const arr = [];
    for (let i = 0; i < k; i++) {
      const exp = new Date();
      exp.setDate(exp.getDate() + randInt(15, 365));
      const qtyRecv = randInt(50, 1000);
      const qtyAvail = qtyRecv - randInt(0, Math.floor(qtyRecv * 0.3));
      const supplier = randChoice(suppliers);
      const batch = {
        product_id: p.id,
        batch_no: `${p.sku}-B${randInt(1000, 9999)}`,
        expiry_date: exp.toISOString().slice(0, 10),
        qty_received: qtyRecv,
        qty_available: Math.max(qtyAvail, 0),
        supplier_id: supplier.id,
        cost_price: Math.max(1, Math.round((p.sell_price * 0.5) * 100) / 100),
      };
      batchesPayload.push(batch);
      arr.push(batch);
    }
    productToBatches.set(p.id, arr);
  }
  const batchesInserted = await chunkedInsert('batches', batchesPayload, 500, 'id,product_id,batch_no,expiry_date,qty_available');
  let idx = 0;
  for (const arr of productToBatches.values()) {
    for (let i = 0; i < arr.length; i++) {
      Object.assign(arr[i], batchesInserted[idx]);
      idx++;
    }
    arr.sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));
  }

  console.log('Creating sales and sale_items with FEFO allocation...');
  const salesPayload = Array.from({ length: CONFIG.NUM_SALES }, (_, i) => ({
    invoice_no: `INV-${String(i + 1).padStart(6, '0')}`,
    date: randDateWithinDays(CONFIG.START_DAYS_AGO),
    cashier_id: cashierId,
    payment_type: randChoice(['cash', 'card', 'mobile']),
    total: 0,
    pharmacy_id: pharmacyId,
    status: 'completed',
  }));
  const sales = await chunkedInsert('sales', salesPayload, 300, 'id,invoice_no,date');

  const saleItemsPayload = [];
  const batchUpdates = new Map();
  for (const sale of sales) {
    const numItems = randInt(CONFIG.MIN_ITEMS_PER_SALE, CONFIG.MAX_ITEMS_PER_SALE);
    const chosenProducts = new Set();
    for (let j = 0; j < numItems; j++) {
      const product = randChoice(products);
      if (chosenProducts.has(product.id)) continue;
      chosenProducts.add(product.id);

      const batches = productToBatches.get(product.id) || [];
      let picked = null;
      for (const b of batches) {
        const currentAvail = batchUpdates.has(b.id) ? batchUpdates.get(b.id) : b.qty_available;
        if (currentAvail > 0) {
          picked = { ...b, qty_available: currentAvail };
          break;
        }
      }
      if (!picked) continue;

      const maxQty = Math.min(picked.qty_available, 10);
      if (maxQty <= 0) continue;
      const qty = randInt(1, maxQty);
      const discount = Math.random() < 0.1 ? randInt(1, Math.min(10, product.sell_price)) : 0;

      saleItemsPayload.push({
        sale_id: sale.id,
        product_id: product.id,
        batch_id: picked.id,
        qty,
        unit_price: product.sell_price,
        discount,
      });

      batchUpdates.set(picked.id, picked.qty_available - qty);
    }
  }

  const insertedItems = await chunkedInsert('sale_items', saleItemsPayload, 500, 'sale_id,qty,unit_price,discount');

  const totalsBySale = new Map();
  for (const it of insertedItems) {
    const lineTotal = Number(it.qty) * Number(it.unit_price) - Number(it.discount || 0);
    totalsBySale.set(it.sale_id, Number((totalsBySale.get(it.sale_id) || 0) + lineTotal));
  }

  console.log('Updating sales totals...');
  const salesUpdates = [];
  for (const s of sales) {
    const total = totalsBySale.get(s.id) || 0;
    salesUpdates.push({ id: s.id, total });
  }
  await chunkedUpdate('sales', salesUpdates, 'id', 500);

  console.log('Updating batches qty_available...');
  const batchUpdateRows = [];
  for (const [batchId, newAvail] of batchUpdates.entries()) {
    batchUpdateRows.push({ id: batchId, qty_available: Math.max(0, newAvail) });
  }
  if (batchUpdateRows.length > 0) {
    await chunkedUpdate('batches', batchUpdateRows, 'id', 500);
  }

  console.log('Seed completed successfully.');
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
