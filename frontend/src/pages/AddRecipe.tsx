import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { useRecipes, RecipeIngredient } from '@/contexts/RecipeContext';
import { useToast } from '@/hooks/use-toast';
import { StructuredIngredientInput } from '@/components/StructuredIngredientInput';

interface RecipeFormData {
  title: string;
  description: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  ingredients: RecipeIngredient[];
  instructions: string[];
  tags: string[];
}

const AddRecipe = () => {
  const navigate = useNavigate();
  const { addRecipe } = useRecipes();
  const { toast } = useToast();
  
  const form = useForm<RecipeFormData>({
    defaultValues: {
      title: '',
      description: '',
      prepTime: 10,
      cookTime: 20,
      servings: 4,
      difficulty: 'Easy',
      ingredients: [],
      instructions: [''],
      tags: [],
    },
  });

  const [ingredients, setIngredients] = React.useState<RecipeIngredient[]>([]);
  const [instructions, setInstructions] = React.useState(['']);
  const [tags, setTags] = React.useState<string[]>([]);
  const [newTag, setNewTag] = React.useState('');
  const [ingredientStepMap, setIngredientStepMap] = React.useState<{[ingredientId: string]: number[]}>({});

  const addInstruction = () => {
    setInstructions([...instructions, '']);
  };

  const removeInstruction = (index: number) => {
    const newInstructions = instructions.filter((_, i) => i !== index);
    setInstructions(newInstructions);
    
    // Update ingredient-step mappings when removing a step
    const updatedMap = { ...ingredientStepMap };
    Object.keys(updatedMap).forEach(ingredientId => {
      updatedMap[ingredientId] = updatedMap[ingredientId]
        .filter(stepIndex => stepIndex !== index)
        .map(stepIndex => stepIndex > index ? stepIndex - 1 : stepIndex);
    });
    setIngredientStepMap(updatedMap);
  };

  const updateInstruction = (index: number, value: string) => {
    const updated = [...instructions];
    updated[index] = value;
    setInstructions(updated);
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const toggleIngredientForStep = (ingredientId: string, stepIndex: number) => {
    const currentSteps = ingredientStepMap[ingredientId] || [];
    const isLinked = currentSteps.includes(stepIndex);
    
    if (isLinked) {
      setIngredientStepMap({
        ...ingredientStepMap,
        [ingredientId]: currentSteps.filter(step => step !== stepIndex)
      });
    } else {
      setIngredientStepMap({
        ...ingredientStepMap,
        [ingredientId]: [...currentSteps, stepIndex].sort((a, b) => a - b)
      });
    }
  };

  const onSubmit = (data: RecipeFormData) => {
    const validIngredients = ingredients.filter(ing => ing.itemId && ing.quantity > 0);
    const filteredInstructions = instructions.filter(inst => inst.trim() !== '');
    
    if (validIngredients.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one ingredient.",
        variant: "destructive",
      });
      return;
    }

    if (filteredInstructions.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one instruction.",
        variant: "destructive",
      });
      return;
    }

    // Add step mapping to ingredients
    const ingredientsWithSteps = validIngredients.map(ingredient => ({
      ...ingredient,
      usedInSteps: ingredientStepMap[ingredient.id] || []
    }));

    const recipeData = {
      ...data,
      ingredients: ingredientsWithSteps,
      instructions: filteredInstructions,
      tags,
      isFavorite: false,
    };

    addRecipe(recipeData);
    
    toast({
      title: "Recipe added!",
      description: "Your new recipe has been saved to your collection.",
    });
    
    navigate('/recipes');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-orange-50 to-green-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/recipes')}
              className="text-gray-600"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Recipes
            </Button>
            <h1 className="text-xl font-bold text-gray-900">Add New Recipe</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Essential details about your recipe</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  rules={{ required: "Recipe title is required" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recipe Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Chicken Teriyaki" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  rules={{ required: "Description is required" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief description of your recipe..."
                          className="min-h-[80px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="prepTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prep Time (min)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cookTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cook Time (min)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="servings"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Servings</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="difficulty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Difficulty</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Easy">Easy</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="Hard">Hard</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Structured Ingredients */}
            <StructuredIngredientInput
              ingredients={ingredients}
              onIngredientsChange={setIngredients}
            />

            {/* Instructions */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Instructions</CardTitle>
                    <CardDescription>Step-by-step cooking instructions</CardDescription>
                  </div>
                  <Button type="button" onClick={addInstruction} size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {instructions.map((instruction, index) => (
                  <div key={index} className="space-y-3">
                    <div className="flex gap-2">
                      <div className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium mt-2">
                        {index + 1}
                      </div>
                      <Textarea
                        placeholder={`Step ${index + 1} instructions...`}
                        value={instruction}
                        onChange={(e) => updateInstruction(index, e.target.value)}
                        className="flex-1 min-h-[60px]"
                      />
                      {instructions.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeInstruction(index)}
                          className="mt-2"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    {/* Ingredient mapping for this step */}
                    {ingredients.length > 0 && instruction.trim() && (
                      <div className="ml-8 p-3 bg-gray-50 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                          Ingredients used in this step (optional):
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {ingredients.map((ingredient) => {
                            //const item = getItemById(ingredient.itemId);
                            //if (!item) return null;
                            
                            const isLinked = (ingredientStepMap[ingredient.id] || []).includes(index);
                            
                            return (
                              <div key={ingredient.id} className="flex items-center space-x-2">
                                <Checkbox
                                  checked={isLinked}
                                  onCheckedChange={() => toggleIngredientForStep(ingredient.id, index)}
                                />
                                <span className="text-sm text-gray-600">
                                  {ingredient.quantity} {ingredient.unit} {/*{item.name}*/}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Tags */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Tags</CardTitle>
                <CardDescription>Add tags to categorize your recipe</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    className="flex-1"
                  />
                  <Button type="button" onClick={addTag}>Add Tag</Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, index) => (
                      <div key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm flex items-center gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="text-green-600 hover:text-green-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex gap-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate('/recipes')}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
                Save Recipe
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default AddRecipe;
