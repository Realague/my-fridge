import { useNavigate } from 'react-router-dom';
import { Home, ShoppingCart, Calendar, BookOpen, Boxes } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface BottomNavigationProps {
  currentPage: string;
}

const BottomNavigation = ({ currentPage }: BottomNavigationProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const navItems = [
    { id: 'dashboard', label: t('navigation.home'), icon: Home, route: '/dashboard' },
    { id: 'products', label: t('navigation.products'), icon: Boxes, route: '/products' },
    { id: 'shopping', label: t('navigation.shopping'), icon: ShoppingCart, route: '/shopping' },
    { id: 'meals', label: t('navigation.meals'), icon: Calendar, route: '/meals' },
    { id: 'recipes', label: t('navigation.recipes'), icon: BookOpen, route: '/recipes' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-sm border-t border-border z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.route)}
                aria-label={item.label}
                className={cn(
                  "flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-all duration-200",
                  isActive
                    ? "text-green-600 bg-green-50 bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-5 w-5 sm:mb-1" />
                <span className="hidden text-xs font-medium sm:block">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BottomNavigation;
