// Base de datos de alimentos comunes (por 100g)
export type FoodItem = {
  name: string;
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

export const FOOD_DATABASE: FoodItem[] = [
  // Proteínas
  { name: "Pechuga de pollo", category: "Proteínas", calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0 },
  { name: "Pechuga de pavo", category: "Proteínas", calories: 135, protein: 30, carbs: 0, fat: 1, fiber: 0 },
  { name: "Carne de res magra", category: "Proteínas", calories: 250, protein: 26, carbs: 0, fat: 15, fiber: 0 },
  { name: "Carne molida 90/10", category: "Proteínas", calories: 176, protein: 20, carbs: 0, fat: 10, fiber: 0 },
  { name: "Salmón", category: "Proteínas", calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0 },
  { name: "Atún en agua", category: "Proteínas", calories: 116, protein: 26, carbs: 0, fat: 1, fiber: 0 },
  { name: "Tilapia", category: "Proteínas", calories: 96, protein: 20, carbs: 0, fat: 1.7, fiber: 0 },
  { name: "Camarones", category: "Proteínas", calories: 99, protein: 24, carbs: 0.2, fat: 0.3, fiber: 0 },
  { name: "Huevo entero", category: "Proteínas", calories: 155, protein: 13, carbs: 1.1, fat: 11, fiber: 0 },
  { name: "Clara de huevo", category: "Proteínas", calories: 52, protein: 11, carbs: 0.7, fat: 0.2, fiber: 0 },
  { name: "Cerdo lomo", category: "Proteínas", calories: 143, protein: 26, carbs: 0, fat: 3.5, fiber: 0 },
  { name: "Whey protein (scoop)", category: "Proteínas", calories: 120, protein: 24, carbs: 3, fat: 1.5, fiber: 0 },
  { name: "Tofu firme", category: "Proteínas", calories: 144, protein: 17, carbs: 3, fat: 8, fiber: 2 },

  // Carbohidratos
  { name: "Arroz blanco cocido", category: "Carbohidratos", calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4 },
  { name: "Arroz integral cocido", category: "Carbohidratos", calories: 123, protein: 2.7, carbs: 26, fat: 1, fiber: 1.8 },
  { name: "Papa cocida", category: "Carbohidratos", calories: 87, protein: 1.9, carbs: 20, fat: 0.1, fiber: 1.8 },
  { name: "Camote / Batata", category: "Carbohidratos", calories: 86, protein: 1.6, carbs: 20, fat: 0.1, fiber: 3 },
  { name: "Avena", category: "Carbohidratos", calories: 389, protein: 17, carbs: 66, fat: 7, fiber: 11 },
  { name: "Pan integral", category: "Carbohidratos", calories: 247, protein: 13, carbs: 41, fat: 3.4, fiber: 7 },
  { name: "Pasta cocida", category: "Carbohidratos", calories: 131, protein: 5, carbs: 25, fat: 1.1, fiber: 1.8 },
  { name: "Quinoa cocida", category: "Carbohidratos", calories: 120, protein: 4.4, carbs: 21, fat: 1.9, fiber: 2.8 },
  { name: "Tortilla de maíz", category: "Carbohidratos", calories: 218, protein: 5.7, carbs: 44, fat: 2.8, fiber: 5.3 },
  { name: "Plátano / Banana", category: "Carbohidratos", calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6 },
  { name: "Frijoles negros cocidos", category: "Carbohidratos", calories: 132, protein: 8.9, carbs: 24, fat: 0.5, fiber: 8.7 },
  { name: "Lentejas cocidas", category: "Carbohidratos", calories: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 7.9 },

  // Grasas
  { name: "Aguacate", category: "Grasas", calories: 160, protein: 2, carbs: 9, fat: 15, fiber: 7 },
  { name: "Aceite de oliva (1 cda)", category: "Grasas", calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0 },
  { name: "Mantequilla de maní", category: "Grasas", calories: 588, protein: 25, carbs: 20, fat: 50, fiber: 6 },
  { name: "Almendras", category: "Grasas", calories: 579, protein: 21, carbs: 22, fat: 50, fiber: 12 },
  { name: "Nueces", category: "Grasas", calories: 654, protein: 15, carbs: 14, fat: 65, fiber: 7 },
  { name: "Semillas de chía", category: "Grasas", calories: 486, protein: 17, carbs: 42, fat: 31, fiber: 34 },
  { name: "Queso cheddar", category: "Grasas", calories: 403, protein: 25, carbs: 1.3, fat: 33, fiber: 0 },

  // Lácteos
  { name: "Leche entera", category: "Lácteos", calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3, fiber: 0 },
  { name: "Leche descremada", category: "Lácteos", calories: 34, protein: 3.4, carbs: 5, fat: 0.1, fiber: 0 },
  { name: "Yogur griego natural", category: "Lácteos", calories: 97, protein: 9, carbs: 3.6, fat: 5, fiber: 0 },
  { name: "Yogur griego 0%", category: "Lácteos", calories: 59, protein: 10, carbs: 3.6, fat: 0.4, fiber: 0 },
  { name: "Requesón / Cottage", category: "Lácteos", calories: 98, protein: 11, carbs: 3.4, fat: 4.3, fiber: 0 },

  // Frutas
  { name: "Manzana", category: "Frutas", calories: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4 },
  { name: "Fresas", category: "Frutas", calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3, fiber: 2 },
  { name: "Arándanos", category: "Frutas", calories: 57, protein: 0.7, carbs: 14, fat: 0.3, fiber: 2.4 },
  { name: "Naranja", category: "Frutas", calories: 47, protein: 0.9, carbs: 12, fat: 0.1, fiber: 2.4 },
  { name: "Piña", category: "Frutas", calories: 50, protein: 0.5, carbs: 13, fat: 0.1, fiber: 1.4 },
  { name: "Mango", category: "Frutas", calories: 60, protein: 0.8, carbs: 15, fat: 0.4, fiber: 1.6 },
  { name: "Sandía", category: "Frutas", calories: 30, protein: 0.6, carbs: 8, fat: 0.2, fiber: 0.4 },

  // Verduras
  { name: "Brócoli", category: "Verduras", calories: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6 },
  { name: "Espinaca", category: "Verduras", calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2 },
  { name: "Lechuga", category: "Verduras", calories: 15, protein: 1.4, carbs: 2.9, fat: 0.2, fiber: 1.3 },
  { name: "Tomate", category: "Verduras", calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2 },
  { name: "Zanahoria", category: "Verduras", calories: 41, protein: 0.9, carbs: 10, fat: 0.2, fiber: 2.8 },
  { name: "Pepino", category: "Verduras", calories: 15, protein: 0.7, carbs: 3.6, fat: 0.1, fiber: 0.5 },
  { name: "Cebolla", category: "Verduras", calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1, fiber: 1.7 },
  { name: "Pimiento", category: "Verduras", calories: 31, protein: 1, carbs: 6, fat: 0.3, fiber: 2.1 },
  { name: "Champiñones", category: "Verduras", calories: 22, protein: 3.1, carbs: 3.3, fat: 0.3, fiber: 1 },

  // Snacks / Otros
  { name: "Barra de proteína", category: "Snacks", calories: 200, protein: 20, carbs: 22, fat: 7, fiber: 3 },
  { name: "Granola", category: "Snacks", calories: 471, protein: 10, carbs: 64, fat: 20, fiber: 5 },
  { name: "Chocolate oscuro 70%", category: "Snacks", calories: 598, protein: 8, carbs: 46, fat: 43, fiber: 11 },
  { name: "Galletas de arroz", category: "Snacks", calories: 387, protein: 8, carbs: 82, fat: 3, fiber: 4 },

  // Bebidas
  { name: "Café negro", category: "Bebidas", calories: 2, protein: 0.3, carbs: 0, fat: 0, fiber: 0 },
  { name: "Jugo de naranja", category: "Bebidas", calories: 45, protein: 0.7, carbs: 10, fat: 0.2, fiber: 0.2 },
  { name: "Batido de proteína con leche", category: "Bebidas", calories: 180, protein: 30, carbs: 12, fat: 3, fiber: 0 },
];

export const MEAL_TYPES = [
  { value: "desayuno", label: "🌅 Desayuno" },
  { value: "almuerzo", label: "🍽️ Almuerzo" },
  { value: "cena", label: "🌙 Cena" },
  { value: "snack", label: "🍎 Snack" },
  { value: "pre_workout", label: "⚡ Pre-Workout" },
  { value: "post_workout", label: "💪 Post-Workout" },
];

export const FOOD_CATEGORIES = [...new Set(FOOD_DATABASE.map(f => f.category))];
