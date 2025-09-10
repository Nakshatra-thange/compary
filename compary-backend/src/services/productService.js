import Product from '../models/productModel.js';
import Price from '../models/priceModel.js';
import mongoose from 'mongoose';
import { cacheService } from './cacheService.js';

// --- NEW HELPER FUNCTION ---
/**
 * Generates a consistent, unique cache key from a query parameters object.
 * @param {object} queryParams The request query parameters.
 * @returns {string} A stable cache key string.
 */

const generateSearchCacheKey = (queryParams) => {
  // Sort keys to ensure ?q=a&p=1 and ?p=1&q=a produce the same key
  const sortedKeys = Object.keys(queryParams).sort();
  if (sortedKeys.length === 0) {
    return 'search:all'; // A key for a search with no parameters
  }
  const queryParts = sortedKeys.map(key => `${key}=${queryParams[key]}`);
  return `search:${queryParts.join('&')}`;
};

const searchProducts = async (queryParams) => {
  const SEARCH_CACHE_TTL_SECONDS = 300; // 5 minutes TTL
  const cacheKey = generateSearchCacheKey(queryParams);
  
  // 1. Check the cache first
  const cachedResults = await cacheService.get(cacheKey);
  if (cachedResults) {
    console.log(`CACHE HIT for search key: ${cacheKey}`);
    return cachedResults;
  }
  console.log(`CACHE MISS for search key: ${cacheKey}`);
  //logic 
  const { q, category, page = 1, limit = 10, sortBy = 'relevance' } = queryParams;

  const query = {};
  
  // Text search using the index we created
  if (q) { query.$text = { $search: q };}
  
  // Category filter
  if (category) { query.category = category;}

  // Sorting logic
  let sortOption = {};
  if (sortBy === 'relevance' && q) {
    sortOption.score = { $meta: 'textScore' };
  } else if (sortBy === 'createdAt') {
    sortOption.createdAt = -1; // Newest first
  }
  // Note: Sorting by price would be more complex and require aggregation,
  // we'll keep it simple for now.

  const skip = (page - 1) * limit;
  
  const products = await Product.find(query)
    .sort(sortOption)
    .skip(skip)
    .limit(Number(limit));
    
  const totalItems = await Product.countDocuments(query);
  const totalPages = Math.ceil(totalItems / limit);

  return { 
    products, 
    pagination: {
      totalItems,
      totalPages,
      currentPage: Number(page),
      hasNextPage: Number(page) < totalPages
    }
  };


// --- NEW CACHING LOGIC ---
  // 2. If we missed, store the fresh results from the DB in the cache
  await cacheService.set(cacheKey, results, SEARCH_CACHE_TTL_SECONDS);
  // --- END OF NEW CACHING LOGIC ---

  return results;
};



const getProductById = async (productId) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return null; // Invalid ID format
  }
  // --- NEW CACHING LOGIC ---
  const cacheKey = `product:${productId}`; // Hierarchical key design
  
  // 1. Try to get the product from the cache first
  const cachedProduct = await cacheService.get(cacheKey);
  if (cachedProduct) {
    console.log(`CACHE HIT for key: ${cacheKey}`);
    return cachedProduct;
  }
  
  console.log(`CACHE MISS for key: ${cacheKey}`);
  
  // 2. If not in cache, get from the database
  const productFromDB = await Product.findById(productId);

  // 3. If found in DB, store it in the cache for next time
  if (productFromDB) {
    // Cache for 1 hour (3600 seconds)
    await cacheService.set(cacheKey, productFromDB, 3600); 
  }

  return productFromDB;
  // --- END OF NEW CACHING LOGIC ---
};
 // NEW: Example of Cache Invalidation
const updateProductById = async (productId, updateData) => {
    // 1. Update the data in the database
    const updatedProduct = await Product.findByIdAndUpdate(productId, updateData, { new: true });

    // 2. Invalidate (delete) the old data from the cache
    if (updatedProduct) {
        const cacheKey = `product:${updatedProduct._id}`;
        await cacheService.del(cacheKey);
        console.log(`CACHE INVALIDATED for key: ${cacheKey}`);
    }
    
    return updatedProduct;
};





const getLatestPricesForProduct = async (productId) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return null; // Invalid ID format
  }

  // This is a powerful MongoDB aggregation pipeline.
  // It finds the most recent price for each platform for a given product.
  return await Price.aggregate([
    // Stage 1: Match all prices for the given product ID
    { $match: { productId: new mongoose.Types.ObjectId(productId) } },
    // Stage 2: Sort by timestamp descending to get the latest prices first
    { $sort: { timestamp: -1 } },
    // Stage 3: Group by platform and take the FIRST document (which is the latest)
    { 
      $group: {
        _id: "$platform", // Group by the platform field
        latestPrice: { $first: "$$ROOT" } // $$ROOT refers to the entire document
      }
    },
    // Stage 4: Replace the root of the output with the nested latestPrice document
    { $replaceRoot: { newRoot: "$latestPrice" } }
  ]);
};

export const productService = {
  searchProducts,
  getProductById,
  getLatestPricesForProduct,
  updateProductById
};