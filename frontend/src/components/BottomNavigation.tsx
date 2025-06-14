
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ShoppingCart, Calendar, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavigationProps {
  currentPage: string;
}

const BottomNavigation = ({ currentPage }: BottomNavigationProps) => {
  const navigate = useNavigate();

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Home, route: '/dashboard' },
    { id: 'shopping', label: 'Shopping', icon: ShoppingCart, route: '/shopping' },
    { id: 'meal-plans', label: 'Meals', icon: Calendar, route: '/meal-plans' },
    { id: 'recipes', label: 'Recipes', icon: BookOpen, route: '/recipes' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t border-gray-200 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.route)}
                className={cn(
                  "flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-all duration-200",
                  isActive
                    ? "text-green-600 bg-green-50"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                )}
              >
                <Icon className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BottomNavigation;
