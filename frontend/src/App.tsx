import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ThemeProvider } from "next-themes";
import "./i18n/config"; // Initialize i18n


import { RecipeProvider } from "@/contexts/RecipeContext";
import { MealPlanProvider } from "@/contexts/MealPlanContext";
import { StoreProvider } from "@/components/StoreProvider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Shopping from "./pages/Shopping";
import StorageArea from "./pages/StorageArea";

import Recipes from "./pages/Recipes";
import RecipeDetails from "./pages/RecipeDetails";
import RecipeCookingMode from "./pages/RecipeCookingMode";
import AddRecipe from "./pages/AddRecipe";
import EditRecipe from "./pages/EditRecipe";
import MealPlans from "./pages/MealPlans";
import Household from "./pages/Household";
import HouseholdDetails from "./pages/HouseholdDetails";
import Demo from "./pages/Demo";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import ItemMinimums from "./pages/ItemMinimums";

const queryClient = new QueryClient();

function App() {
  const initializeGoogleAuth = useAuthStore(state => state.initializeGoogleAuth);

  useEffect(() => {
    // Initialize Google Auth when the app loads (only once on mount)
    initializeGoogleAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this only runs once on mount

    return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <TooltipProvider>
          <NotificationProvider>
            <RecipeProvider>
              <BrowserRouter>
                <MealPlanProvider>
                  <StoreProvider>
                    <Toaster />
                    <Sonner /> 
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/onboarding" element={<Onboarding />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/shopping" element={<Shopping />} />
                      <Route path="/storage/:id" element={<StorageArea />} />
                      <Route path="/recipes" element={<Recipes />} />
                      <Route path="/recipes/:id" element={<RecipeDetails />} />
                      <Route path="/recipes/:id/cook" element={<RecipeCookingMode />} />
                      <Route path="/add-recipe" element={<AddRecipe />} />
                      <Route path="/recipes/:id/edit" element={<EditRecipe />} />
                      <Route path="/meal-plans" element={<MealPlans />} />
                      <Route path="/household" element={<Household />} />
                      <Route path="/household/:id" element={<HouseholdDetails />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/item-minimums" element={<ItemMinimums />} />
                      <Route path="/demo" element={<Demo />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </StoreProvider>
                </MealPlanProvider>
              </BrowserRouter>
            </RecipeProvider>
          </NotificationProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
