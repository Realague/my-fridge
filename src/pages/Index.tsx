
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Users, Utensils, ShoppingCart, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-orange-50 to-green-100">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-green-500 to-orange-500 rounded-2xl mb-4">
              <span className="text-3xl">🍃</span>
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
            My<span className="text-green-600">Fridge</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Manage your household food inventory, collaborate on shopping, and plan meals together. 
            Reduce waste, save time, and never forget what's in your fridge again.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl"
              onClick={() => navigate('/auth')}
            >
              Get Started <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="border-green-600 text-green-600 hover:bg-green-50 px-8 py-3 rounded-xl"
              onClick={() => navigate('/demo')}
            >
              See Demo
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardHeader className="pb-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle className="text-lg">Household Sharing</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Invite family members and roommates to collaborate on your shared kitchen inventory.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardHeader className="pb-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                <Utensils className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-lg">Smart Inventory</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Track what's in your fridge, freezer, and pantry with expiry dates and low-stock alerts.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardHeader className="pb-3">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-3">
                <ShoppingCart className="h-6 w-6 text-orange-600" />
              </div>
              <CardTitle className="text-lg">Shopping Lists</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Generate shopping lists automatically from meal plans or add items manually.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardHeader className="pb-3">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle className="text-lg">Meal Planning</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Plan weekly meals with your saved recipes and automatically check your inventory.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Demo Preview */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">See MyFridge in Action</h2>
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-green-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl">🥬</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Track Inventory</h3>
                <p className="text-gray-600 text-sm">
                  See what's in your fridge, freezer, and pantry at a glance
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-orange-400 to-orange-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl">📝</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Plan Together</h3>
                <p className="text-gray-600 text-sm">
                  Collaborate with household members on meal planning
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-blue-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl">🛒</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Shop Smart</h3>
                <p className="text-gray-600 text-sm">
                  Auto-generate shopping lists from your meal plans
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white/50 backdrop-blur-sm mt-16 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-600">
            © 2025 MyFridge. Built with love for better food management.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
