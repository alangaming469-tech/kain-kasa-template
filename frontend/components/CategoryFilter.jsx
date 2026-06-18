/**
 * Category Filter Component
 */

import React from 'react';

function CategoryFilter({ categories, loading, selectedCategory, onSelect }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm text-gray-600">Loading categories...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {/* All Categories */}
      <button
        onClick={() => onSelect('all')}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
          selectedCategory === null
            ? 'bg-indigo-600 text-white shadow-md'
            : 'bg-white text-gray-700 hover:bg-indigo-50 border border-gray-300'
        }`}
      >
        All
      </button>

      {/* Categories */}
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelect(category.slug)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            selectedCategory === category.slug
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white text-gray-700 hover:bg-indigo-50 border border-gray-300'
          }`}
        >
          {category.name}
          {category.productCount > 0 && (
            <span className="ml-1 text-xs opacity-75">
              ({category.productCount})
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export default CategoryFilter;