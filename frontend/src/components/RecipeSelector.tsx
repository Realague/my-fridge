import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RecipeDto } from '@/services/recipeService';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface RecipeSelectorProps {
  onRecipeSelect: (recipe: RecipeDto | null) => void;
  placeholder?: string;
  className?: string;
  selectedRecipe?: RecipeDto | null;
  recipes: RecipeDto[];
  loading?: boolean;
}

export const RecipeSelector = ({ 
  onRecipeSelect, 
  placeholder, 
  className,
  selectedRecipe = null,
  recipes,
  loading = false
}: RecipeSelectorProps) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredRecipes = query.trim() 
    ? recipes.filter(recipe => 
        recipe.title.toLowerCase().includes(query.toLowerCase()) ||
        recipe.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
      )
    : recipes;

  const updateDropdownPosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isClickInside = (
        (dropdownRef.current && dropdownRef.current.contains(target)) ||
        (containerRef.current && containerRef.current.contains(target))
      );
      
      if (!isClickInside && isOpen) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      if (isOpen) {
        updateDropdownPosition();
      }
    };

    const handleResize = () => {
      if (isOpen) {
        updateDropdownPosition();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  const handleRecipeSelect = (recipe: RecipeDto) => {
    console.log('RecipeSelector: handleRecipeSelect called with:', recipe.title);
    onRecipeSelect(recipe);
    setQuery('');
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setIsOpen(true);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    setTimeout(updateDropdownPosition, 0);
  };

  const handleClearSelection = () => {
    setQuery('');
    setIsOpen(false);
    onRecipeSelect(null);
  };

  const displayValue = selectedRecipe && !query ? selectedRecipe.title : query;
  const showClearButton = selectedRecipe && !query;

  const getDifficultyColor = (difficulty: string) => {
    const colors: { [key: string]: string } = {
      'Easy': 'bg-green-100 text-green-800',
      'Medium': 'bg-yellow-100 text-yellow-800',
      'Hard': 'bg-red-100 text-red-800',
    };
    return colors[difficulty] || colors['Easy'];
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder || t('pages.recipes.search')}
          className="pr-20"
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {showClearButton && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearSelection}
              className="h-6 w-6 p-0 hover:bg-gray-100"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleInputFocus}
            className="h-6 w-6 p-0 hover:bg-gray-100"
          >
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </Button>
        </div>
      </div>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[99999] bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-y-auto"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            minWidth: dropdownPosition.width,
            pointerEvents: 'auto'
          }}
        >
          {loading && (
            <div className="flex items-center justify-center p-4 text-sm text-gray-500 bg-white">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              {t('recipeSelector.loadingRecipes')}
            </div>
          )}

          {filteredRecipes.length > 0 && (
            <div className="p-1">
              {filteredRecipes.slice(0, 8).map((recipe) => (
                <button
                  key={recipe.id}
                  type="button"
                  onClick={() => handleRecipeSelect(recipe)}
                  className="group flex items-center justify-between p-2 hover:bg-gray-100 cursor-pointer rounded transition-colors w-full text-left"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{recipe.title}</div>
                      <div className="flex items-center gap-2">
                        <Badge className={getDifficultyColor(recipe.difficulty)}>
                          {t(`pages.recipes.${recipe.difficulty.toLowerCase()}`)}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {recipe.prepTime + recipe.cookTime} min • {recipe.servings} {t('pages.recipes.servings')}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {filteredRecipes.length === 0 && !query.trim() && !loading && (
            <div className="p-4 text-center text-sm text-gray-500 bg-white">
              {t('recipeSelector.startTyping')}
            </div>
          )}

          {filteredRecipes.length === 0 && query.trim() && !loading && (
            <div className="p-4 text-center text-sm text-gray-500 bg-white">
              {t('recipeSelector.noRecipesFound', { query })}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};
