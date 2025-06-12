
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ItemProvider } from "@/contexts/ItemContext";
import { StorageProvider } from "@/contexts/StorageContext";
import { RecipeProvider } from "@/contexts/RecipeContext";
import { MealPlanProvider } from "@/contexts/MealPlanContext";
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
import Profile from "./pages/Profile";
import Demo from "./pages/Demo";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ItemProvider>
        <StorageProvider>
          <RecipeProvider>
            <MealPlanProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/shopping" element={<Shopping />} />
                  <Route path="/storage/:areaId" element={<StorageArea />} />
                  <Route path="/recipes" element={<Recipes />} />
                  <Route path="/recipes/new" element={<AddRecipe />} />
                  <Route path="/recipes/:id" element={<RecipeDetails />} />
                  <Route path="/recipes/:id/edit" element={<EditRecipe />} />
                  <Route path="/recipes/:id/cook" element={<RecipeCookingMode />} />
                  <Route path="/meal-plans" element={<MealPlans />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/demo" element={<Demo />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </MealPlanProvider>
          </RecipeProvider>
        </StorageProvider>
      </ItemProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
