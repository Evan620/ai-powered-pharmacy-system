// Utility functions to transform Supabase relationship data
// Supabase joins return arrays even for single relationships, 
// but our TypeScript interfaces expect single objects

/**
 * Transform Supabase relationship arrays to single objects
 * @param data - The data from Supabase query
 * @param relationshipKeys - Array of keys that should be transformed from arrays to single objects
 */
export function transformSupabaseRelationships<T>(
  data: any[], 
  relationshipKeys: string[]
): T[] {
  if (!data || !Array.isArray(data)) return [];
  
  return data.map(item => {
    const transformed = { ...item };
    
    relationshipKeys.forEach(key => {
      if (transformed[key] && Array.isArray(transformed[key])) {
        // Take the first item if it's an array, otherwise keep as is
        transformed[key] = transformed[key][0] || null;
      }
    });
    
    return transformed;
  });
}

/**
 * Transform nested relationships (e.g., batch.products, adjustment.performed_by)
 */
export function transformNestedRelationships<T>(
  data: any[],
  nestedTransforms: { [key: string]: string[] }
): T[] {
  if (!data || !Array.isArray(data)) return [];
  
  return data.map(item => {
    const transformed = { ...item };
    
    Object.entries(nestedTransforms).forEach(([parentKey, childKeys]) => {
      if (transformed[parentKey]) {
        const parent = { ...transformed[parentKey] };
        
        childKeys.forEach(childKey => {
          if (parent[childKey] && Array.isArray(parent[childKey])) {
            parent[childKey] = parent[childKey][0] || null;
          }
        });
        
        transformed[parentKey] = parent;
      }
    });
    
    return transformed;
  });
}

/**
 * Specific transformers for common patterns
 */
export const transformBatches = (data: any[]) => 
  transformSupabaseRelationships(data, ['products', 'suppliers']);

export const transformSaleItems = (data: any[]) => 
  transformSupabaseRelationships(data, ['products', 'batches']);

export const transformAdjustments = (data: any[]) => 
  transformNestedRelationships(data, {
    'performed_by': [],
    'batch': ['products']
  });

export const transformProfiles = (data: any[]) => 
  transformSupabaseRelationships(data, ['profiles']);
