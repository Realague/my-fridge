import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Demo = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
        </Button>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            MyFridge Demo
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Experience how MyFridge makes household food management effortless
          </p>
        </div>

        {/* Demo Sections */}
        <div className="space-y-12 max-w-4xl mx-auto">
          {/* Storage Areas */}
          <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-3">
                <span className="text-3xl">🏠</span>
                Storage Areas
              </CardTitle>
              <CardDescription>
                Organize your food by location with customizable storage areas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-accent p-4 rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">🥬</span>
                    <div>
                      <h3 className="font-semibold">Fridge</h3>
                      <p className="text-sm text-muted-foreground">12 items</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Milk</span>
                      <span className="text-orange-600">Expires in 2 days</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Carrots</span>
                      <span className="text-green-600">Fresh</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Yogurt</span>
                      <span className="text-green-600">Fresh</span>
                    </div>
                  </div>
                </div>

                <div className="bg-accent p-4 rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">🧊</span>
                    <div>
                      <h3 className="font-semibold">Freezer</h3>
                      <p className="text-sm text-muted-foreground">8 items</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Ice Cream</span>
                      <span className="text-green-600">Good</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Frozen Peas</span>
                      <span className="text-green-600">Good</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Chicken</span>
                      <span className="text-green-600">Good</span>
                    </div>
                  </div>
                </div>

                <div className="bg-accent p-4 rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">🏺</span>
                    <div>
                      <h3 className="font-semibold">Pantry</h3>
                      <p className="text-sm text-muted-foreground">25 items</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Rice</span>
                      <span className="text-green-600">Plenty</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pasta</span>
                      <span className="text-orange-600">Low stock</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Canned Beans</span>
                      <span className="text-green-600">Good</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shopping List */}
          <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-3">
                <span className="text-3xl">🛒</span>
                Smart Shopping Lists
              </CardTitle>
              <CardDescription>
                Auto-generated from meal plans or manually added items
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-xl">
                <h3 className="font-semibold mb-3">This Week's Shopping List</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" className="rounded" />
                    <span>Milk (1 gallon)</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Auto-added</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" className="rounded" />
                    <span>Pasta (2 boxes)</span>
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">Low stock</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked className="rounded" />
                    <span className="line-through text-muted-foreground">Tomatoes</span>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Bought</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" className="rounded" />
                    <span>Bread</span>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">Manual</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Meal Planning */}
          <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-3">
                <span className="text-3xl">📅</span>
                Meal Planning
              </CardTitle>
              <CardDescription>
                Plan meals with your recipes and check inventory automatically
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">This Week's Meals</h3>
                  <div className="space-y-3">
                    <div className="bg-accent p-3 rounded-lg">
                      <div className="font-medium">Monday: Spaghetti Carbonara</div>
                      <div className="text-sm text-muted-foreground">✅ All ingredients available</div>
                    </div>
                    <div className="bg-accent p-3 rounded-lg">
                      <div className="font-medium">Tuesday: Chicken Stir Fry</div>
                      <div className="text-sm text-orange-700">⚠️ Need: Soy sauce, Ginger</div>
                    </div>
                    <div className="bg-accent p-3 rounded-lg">
                      <div className="font-medium">Wednesday: Veggie Burgers</div>
                      <div className="text-sm text-muted-foreground">✅ All ingredients available</div>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">Recipe Book</h3>
                  <div className="space-y-3">
                    <div className="bg-card p-3 rounded-lg border">
                      <div className="font-medium">Spaghetti Carbonara</div>
                      <div className="text-sm text-muted-foreground">⭐ 4.8 • 30 min • Easy</div>
                    </div>
                    <div className="bg-card p-3 rounded-lg border">
                      <div className="font-medium">Chicken Stir Fry</div>
                      <div className="text-sm text-muted-foreground">⭐ 4.5 • 25 min • Medium</div>
                    </div>
                    <div className="bg-card p-3 rounded-lg border">
                      <div className="font-medium">Veggie Burgers</div>
                      <div className="text-sm text-muted-foreground">⭐ 4.7 • 20 min • Easy</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12">
          <Button
            onClick={() => navigate('/auth')}
            size="lg"
            className="bg-primary/10 text-primary hover:bg-primary/15 px-8 py-3 rounded-xl"
          >
            Start Using MyFridge <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Demo;
