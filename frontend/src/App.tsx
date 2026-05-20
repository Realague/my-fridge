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
import { StoreProvider } from "@/components/StoreProvider";
import { StagingEnvBanner } from "@/components/StagingEnvBanner";
import { NotificationClickHandler } from "@/components/NotificationClickHandler";
import { ErrorBoundary, RouteErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Shopping from "./pages/Shopping";
import StorageArea from "./pages/StorageArea";
import MyProducts from "./pages/MyProducts";

import Recipes from "./pages/Recipes";
import RecipeDetails from "./pages/RecipeDetails";
import RecipeCookingMode from "./pages/RecipeCookingMode";
import AddRecipe from "./pages/AddRecipe";
import EditRecipe from "./pages/EditRecipe";
import ImportRecipe from "./pages/ImportRecipe";
import Meals from "./pages/Meals";
import RecipeSelector from "./pages/RecipeSelector";
import MealsShoppingPreview from "./pages/MealsShoppingPreview";
import Household from "./pages/Household";
import HouseholdDetails from "./pages/HouseholdDetails";
import JoinHousehold from "./pages/JoinHousehold";
import Demo from "./pages/Demo";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import ItemMinimums from "./pages/ItemMinimums";
import LoyaltyCards from "./pages/LoyaltyCards";
import More from "./pages/More";
import { AppShell } from "@/components/layout/AppShell";

const queryClient = new QueryClient();

function App() {
  const initializeGoogleAuth = useAuthStore(state => state.initializeGoogleAuth);

  useEffect(() => {
    // Initialize Google Auth when the app loads (only once on mount)
    initializeGoogleAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this only runs once on mount

    return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <TooltipProvider>
            <NotificationProvider>
              <RecipeProvider>
                <BrowserRouter>
                  <StoreProvider>
                    <NotificationClickHandler />
                    <StagingEnvBanner />
                    <Toaster />
                    <Sonner />
                    <RouteErrorBoundary>
                      <Routes>
                        {/* Public routes — no app shell. */}
                        <Route path="/" element={<Index />} />
                        <Route path="/auth" element={<Auth />} />
                        <Route path="/join" element={<JoinHousehold />} />
                        <Route path="/onboarding" element={<Onboarding />} />
                        <Route path="/demo" element={<Demo />} />

                        {/* Authenticated routes — desktop shell wraps the page. */}
                        <Route element={<AppShell />}>
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/shopping" element={<Shopping />} />
                          <Route path="/storage/:id" element={<StorageArea />} />
                          <Route path="/products" element={<MyProducts />} />
                          <Route path="/recipes" element={<Recipes />} />
                          <Route path="/recipes/:id" element={<RecipeDetails />} />
                          <Route path="/recipes/:id/cook" element={<RecipeCookingMode />} />
                          <Route path="/add-recipe" element={<AddRecipe />} />
                          <Route path="/import-recipe" element={<ImportRecipe />} />
                          <Route path="/meals" element={<Meals />} />
                          <Route path="/meals/add" element={<RecipeSelector />} />
                          <Route path="/meals/shopping-preview" element={<MealsShoppingPreview />} />
                          <Route path="/recipes/:id/edit" element={<EditRecipe />} />
                          <Route path="/household" element={<Household />} />
                          <Route path="/household/:id" element={<HouseholdDetails />} />
                          <Route path="/settings" element={<Settings />} />
                          <Route path="/item-minimums" element={<ItemMinimums />} />
                          <Route path="/loyalty-cards" element={<LoyaltyCards />} />
                          <Route path="/more" element={<More />} />
                        </Route>

                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </RouteErrorBoundary>
                  </StoreProvider>
                </BrowserRouter>
              </RecipeProvider>
            </NotificationProvider>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
