export interface FoodItem {
  id?: string | number;
  nome: string;
  marca: string;
  calorias: number;
  proteinas: number;
  carboidratos: number;
  gorduras: number;
  fonte: 'TACO_LOCAL' | 'FATSECRET' | 'OPEN_FOOD_FACTS' | 'MANUAL' | string;
}

export const BASE_TACO_EXPANDIDA: FoodItem[] = [
  // Cereais, Grãos e Panificação
  { nome: 'Arroz Branco Cozido', marca: 'Cereais / TACO', calorias: 128.0, proteinas: 2.5, carboidratos: 28.1, gorduras: 0.2, fonte: 'TACO_LOCAL' },
  { nome: 'Arroz Integral Cozido', marca: 'Cereais / TACO', calorias: 124.0, proteinas: 2.6, carboidratos: 25.8, gorduras: 1.0, fonte: 'TACO_LOCAL' },
  { nome: 'Feijão Carioca Cozido (50% Grão 50% Caldo)', marca: 'Leguminosas / TACO', calorias: 76.0, proteinas: 4.8, carboidratos: 13.6, gorduras: 0.5, fonte: 'TACO_LOCAL' },
  { nome: 'Feijão Preto Cozido', marca: 'Leguminosas / TACO', calorias: 77.0, proteinas: 4.5, carboidratos: 14.0, gorduras: 0.5, fonte: 'TACO_LOCAL' },
  { nome: 'Lentilha Cozida', marca: 'Leguminosas / TACO', calorias: 93.0, proteinas: 6.3, carboidratos: 16.3, gorduras: 0.5, fonte: 'TACO_LOCAL' },
  { nome: 'Grão de Bico Cozido', marca: 'Leguminosas / TACO', calorias: 140.0, proteinas: 8.4, carboidratos: 23.2, gorduras: 2.1, fonte: 'TACO_LOCAL' },
  { nome: 'Aveia em Flocos Finos', marca: 'Quaker / TACO', calorias: 394.0, proteinas: 13.9, carboidratos: 66.6, gorduras: 8.5, fonte: 'TACO_LOCAL' },
  { nome: 'Farinha de Aveia', marca: 'Genérico / TACO', calorias: 380.0, proteinas: 14.0, carboidratos: 65.0, gorduras: 7.5, fonte: 'TACO_LOCAL' },
  { nome: 'Pão de Forma Tradicional', marca: 'Panificação / TACO', calorias: 265.0, proteinas: 8.0, carboidratos: 50.0, gorduras: 3.2, fonte: 'TACO_LOCAL' },
  { nome: 'Pão de Forma Integral', marca: 'Pullman / Wickbold / TACO', calorias: 247.0, proteinas: 9.4, carboidratos: 46.0, gorduras: 3.7, fonte: 'TACO_LOCAL' },
  { nome: 'Pão Francês Tradicional', marca: 'Padaria / TACO', calorias: 300.0, proteinas: 8.0, carboidratos: 58.7, gorduras: 3.1, fonte: 'TACO_LOCAL' },
  { nome: 'Goma de Tapioca Hidratada', marca: 'Típico / TACO', calorias: 240.0, proteinas: 0.1, carboidratos: 60.0, gorduras: 0.0, fonte: 'TACO_LOCAL' },
  { nome: 'Cuscuz de Milho Cozido com Sal', marca: 'Flocão / TACO', calorias: 113.0, proteinas: 2.2, carboidratos: 25.3, gorduras: 0.7, fonte: 'TACO_LOCAL' },
  { nome: 'Macarrão de Sêmola Cozido', marca: 'Massas / TACO', calorias: 140.0, proteinas: 4.6, carboidratos: 28.8, gorduras: 0.5, fonte: 'TACO_LOCAL' },
  { nome: 'Macarrão Integral Cozido', marca: 'Massas / TACO', calorias: 124.0, proteinas: 5.3, carboidratos: 26.5, gorduras: 0.5, fonte: 'TACO_LOCAL' },
  { nome: 'Granola Tradicional sem Açúcar', marca: 'Cereais / TACO', calorias: 421.0, proteinas: 10.0, carboidratos: 68.0, gorduras: 12.0, fonte: 'TACO_LOCAL' },

  // Carnes, Aves, Peixes e Ovos
  { nome: 'Peito de Frango Grelhado', marca: 'Aves / TACO', calorias: 159.0, proteinas: 32.0, carboidratos: 0.0, gorduras: 2.5, fonte: 'TACO_LOCAL' },
  { nome: 'Peito de Frango Cozido Desfiado', marca: 'Aves / TACO', calorias: 163.0, proteinas: 31.5, carboidratos: 0.0, gorduras: 3.2, fonte: 'TACO_LOCAL' },
  { nome: 'Sobrecoxa de Frango sem Pele Grelhada', marca: 'Aves / TACO', calorias: 167.0, proteinas: 28.8, carboidratos: 0.0, gorduras: 5.0, fonte: 'TACO_LOCAL' },
  { nome: 'Carne Bovina Patinho Grelhado', marca: 'Carnes / TACO', calorias: 219.0, proteinas: 35.9, carboidratos: 0.0, gorduras: 7.3, fonte: 'TACO_LOCAL' },
  { nome: 'Carne Bovina Alcatra Grelhada', marca: 'Carnes / TACO', calorias: 241.0, proteinas: 31.9, carboidratos: 0.0, gorduras: 11.6, fonte: 'TACO_LOCAL' },
  { nome: 'Carne Moída Patinho Refogada', marca: 'Preparo Caseiro', calorias: 225.0, proteinas: 32.0, carboidratos: 0.0, gorduras: 10.0, fonte: 'TACO_LOCAL' },
  { nome: 'Carne Bovina Músculo Cozido', marca: 'Carnes / TACO', calorias: 194.0, proteinas: 31.2, carboidratos: 0.0, gorduras: 6.7, fonte: 'TACO_LOCAL' },
  { nome: 'Carne Bovina Filé Mignon Grelhado', marca: 'Carnes / TACO', calorias: 220.0, proteinas: 32.8, carboidratos: 0.0, gorduras: 8.8, fonte: 'TACO_LOCAL' },
  { nome: 'Carne Bovina Contra-Filé Grelhado', marca: 'Carnes / TACO', calorias: 245.0, proteinas: 32.4, carboidratos: 0.0, gorduras: 12.1, fonte: 'TACO_LOCAL' },
  { nome: 'Lombo Suíno Assado', marca: 'Carnes / TACO', calorias: 210.0, proteinas: 35.7, carboidratos: 0.0, gorduras: 6.4, fonte: 'TACO_LOCAL' },
  { nome: 'Tilápia Filé Grelhado', marca: 'Pescados / TACO', calorias: 128.0, proteinas: 26.0, carboidratos: 0.0, gorduras: 2.6, fonte: 'TACO_LOCAL' },
  { nome: 'Salmão Filé Grelhado', marca: 'Pescados / TACO', calorias: 229.0, proteinas: 23.9, carboidratos: 0.0, gorduras: 14.0, fonte: 'TACO_LOCAL' },
  { nome: 'Atum em Pedaços em Água', marca: 'Gomes da Costa / Coqueiro', calorias: 116.0, proteinas: 26.0, carboidratos: 0.0, gorduras: 0.8, fonte: 'TACO_LOCAL' },
  { nome: 'Ovo de Galinha Inteiro Cozido', marca: 'Ovos / TACO', calorias: 146.0, proteinas: 13.3, carboidratos: 0.6, gorduras: 9.5, fonte: 'TACO_LOCAL' },
  { nome: 'Clara de Ovo Cozida', marca: 'Ovos / TACO', calorias: 52.0, proteinas: 11.0, carboidratos: 0.7, gorduras: 0.2, fonte: 'TACO_LOCAL' },
  { nome: 'Ovo de Galinha Frito / Mexido', marca: 'Preparo Caseiro', calorias: 240.0, proteinas: 15.6, carboidratos: 1.2, gorduras: 18.6, fonte: 'TACO_LOCAL' },

  // Vegetais, Legumes, Tubérculos e Frutas
  { nome: 'Brócolis Cozido', marca: 'Hortifrúti / TACO', calorias: 25.0, proteinas: 2.1, carboidratos: 4.4, gorduras: 0.5, fonte: 'TACO_LOCAL' },
  { nome: 'Brócolis Cru', marca: 'Hortifrúti / TACO', calorias: 25.0, proteinas: 3.6, carboidratos: 4.0, gorduras: 0.3, fonte: 'TACO_LOCAL' },
  { nome: 'Couve-Flor Cozida', marca: 'Hortifrúti / TACO', calorias: 19.0, proteinas: 1.2, carboidratos: 3.9, gorduras: 0.2, fonte: 'TACO_LOCAL' },
  { nome: 'Espinafre Cozido', marca: 'Hortifrúti / TACO', calorias: 16.0, proteinas: 2.7, carboidratos: 1.4, gorduras: 0.2, fonte: 'TACO_LOCAL' },
  { nome: 'Alface Crespa Crua', marca: 'Hortifrúti / TACO', calorias: 11.0, proteinas: 1.3, carboidratos: 1.7, gorduras: 0.2, fonte: 'TACO_LOCAL' },
  { nome: 'Tomate Cru com Semente', marca: 'Hortifrúti / TACO', calorias: 15.0, proteinas: 1.1, carboidratos: 3.1, gorduras: 0.2, fonte: 'TACO_LOCAL' },
  { nome: 'Cenoura Cozida', marca: 'Hortifrúti / TACO', calorias: 30.0, proteinas: 0.8, carboidratos: 6.7, gorduras: 0.2, fonte: 'TACO_LOCAL' },
  { nome: 'Cenoura Crua', marca: 'Hortifrúti / TACO', calorias: 34.0, proteinas: 1.3, carboidratos: 7.7, gorduras: 0.2, fonte: 'TACO_LOCAL' },
  { nome: 'Abobrinha Cozida', marca: 'Hortifrúti / TACO', calorias: 15.0, proteinas: 1.1, carboidratos: 3.0, gorduras: 0.2, fonte: 'TACO_LOCAL' },
  { nome: 'Abóbora Cabotiá Cozida', marca: 'Hortifrúti / TACO', calorias: 48.0, proteinas: 1.4, carboidratos: 10.8, gorduras: 0.7, fonte: 'TACO_LOCAL' },
  { nome: 'Batata Doce Cozida', marca: 'Hortifrúti / TACO', calorias: 77.0, proteinas: 0.6, carboidratos: 18.4, gorduras: 0.1, fonte: 'TACO_LOCAL' },
  { nome: 'Batata Inglesa Cozida', marca: 'Hortifrúti / TACO', calorias: 52.0, proteinas: 1.2, carboidratos: 11.9, gorduras: 0.1, fonte: 'TACO_LOCAL' },
  { nome: 'Batata Inglesa Assada / Airfryer', marca: 'Preparo Caseiro', calorias: 93.0, proteinas: 2.5, carboidratos: 21.0, gorduras: 0.2, fonte: 'TACO_LOCAL' },
  { nome: 'Mandioca / Aipim Cozido', marca: 'Hortifrúti / TACO', calorias: 125.0, proteinas: 0.6, carboidratos: 30.1, gorduras: 0.3, fonte: 'TACO_LOCAL' },
  { nome: 'Banana Prata Crua', marca: 'Fruta / TACO', calorias: 98.0, proteinas: 1.3, carboidratos: 26.0, gorduras: 0.1, fonte: 'TACO_LOCAL' },
  { nome: 'Banana Nanica Crua', marca: 'Fruta / TACO', calorias: 92.0, proteinas: 1.4, carboidratos: 23.8, gorduras: 0.1, fonte: 'TACO_LOCAL' },
  { nome: 'Maçã Fuji com Casca', marca: 'Fruta / TACO', calorias: 56.0, proteinas: 0.3, carboidratos: 15.2, gorduras: 0.2, fonte: 'TACO_LOCAL' },
  { nome: 'Mamão Papaya Cru', marca: 'Fruta / TACO', calorias: 40.0, proteinas: 0.5, carboidratos: 10.4, gorduras: 0.1, fonte: 'TACO_LOCAL' },
  { nome: 'Morango Fresco Cru', marca: 'Fruta / TACO', calorias: 30.0, proteinas: 0.9, carboidratos: 6.8, gorduras: 0.3, fonte: 'TACO_LOCAL' },
  { nome: 'Abacate Cru', marca: 'Fruta / TACO', calorias: 96.0, proteinas: 1.2, carboidratos: 6.0, gorduras: 8.4, fonte: 'TACO_LOCAL' },
  { nome: 'Laranja Pera Crua', marca: 'Fruta / TACO', calorias: 37.0, proteinas: 1.0, carboidratos: 8.9, gorduras: 0.1, fonte: 'TACO_LOCAL' },
  { nome: 'Melancia Crua', marca: 'Fruta / TACO', calorias: 33.0, proteinas: 0.9, carboidratos: 8.1, gorduras: 0.0, fonte: 'TACO_LOCAL' },
  { nome: 'Manga Tommy Crua', marca: 'Fruta / TACO', calorias: 51.0, proteinas: 0.5, carboidratos: 12.8, gorduras: 0.2, fonte: 'TACO_LOCAL' },
  { nome: 'Abacaxi Pérola Cru', marca: 'Fruta / TACO', calorias: 48.0, proteinas: 0.9, carboidratos: 12.3, gorduras: 0.1, fonte: 'TACO_LOCAL' },
  { nome: 'Uva Niágara Crua', marca: 'Fruta / TACO', calorias: 53.0, proteinas: 0.7, carboidratos: 13.6, gorduras: 0.2, fonte: 'TACO_LOCAL' },

  // Laticínios e Derivados (Marcas Populares Brasileiras)
  { nome: 'Leite Integral UHT', marca: 'Piracanjuba', calorias: 61.0, proteinas: 3.1, carboidratos: 4.7, gorduras: 3.2, fonte: 'TACO_LOCAL' },
  { nome: 'Leite Desnatado UHT', marca: 'Piracanjuba', calorias: 35.0, proteinas: 3.2, carboidratos: 4.9, gorduras: 0.0, fonte: 'TACO_LOCAL' },
  { nome: 'Leite Semidesnatado UHT', marca: 'Piracanjuba', calorias: 46.0, proteinas: 3.1, carboidratos: 4.8, gorduras: 1.5, fonte: 'TACO_LOCAL' },
  { nome: 'Leite Integral UHT', marca: 'Itambé', calorias: 60.0, proteinas: 3.0, carboidratos: 4.5, gorduras: 3.2, fonte: 'TACO_LOCAL' },
  { nome: 'Leite Desnatado UHT', marca: 'Itambé', calorias: 34.0, proteinas: 3.1, carboidratos: 4.8, gorduras: 0.0, fonte: 'TACO_LOCAL' },
  { nome: 'Leite Integral', marca: 'Batavo', calorias: 60.0, proteinas: 3.0, carboidratos: 4.5, gorduras: 3.2, fonte: 'TACO_LOCAL' },
  { nome: 'Leite Desnatado', marca: 'Batavo', calorias: 35.0, proteinas: 3.1, carboidratos: 4.9, gorduras: 0.0, fonte: 'TACO_LOCAL' },
  { nome: 'Iogurte Grego Tradicional', marca: 'Vigor', calorias: 130.0, proteinas: 4.8, carboidratos: 14.0, gorduras: 6.2, fonte: 'TACO_LOCAL' },
  { nome: 'Iogurte Grego Zero Gordura', marca: 'Vigor', calorias: 65.0, proteinas: 7.0, carboidratos: 9.0, gorduras: 0.0, fonte: 'TACO_LOCAL' },
  { nome: 'Bebida Láctea YoPRO 15g Proteína', marca: 'Danone', calorias: 62.0, proteinas: 6.0, carboidratos: 7.2, gorduras: 0.8, fonte: 'TACO_LOCAL' },
  { nome: 'Requeijão Tradicional', marca: 'Vigor', calorias: 257.0, proteinas: 9.6, carboidratos: 3.0, gorduras: 23.0, fonte: 'TACO_LOCAL' },
  { nome: 'Requeijão Light', marca: 'Vigor', calorias: 170.0, proteinas: 11.0, carboidratos: 3.5, gorduras: 12.0, fonte: 'TACO_LOCAL' },
  { nome: 'Queijo Minas Frescal', marca: 'Laticínios / TACO', calorias: 264.0, proteinas: 17.4, carboidratos: 3.2, gorduras: 20.2, fonte: 'TACO_LOCAL' },
  { nome: 'Queijo Mussarela Fatiado', marca: 'Laticínios / TACO', calorias: 330.0, proteinas: 22.0, carboidratos: 2.0, gorduras: 26.0, fonte: 'TACO_LOCAL' },
  { nome: 'Queijo Prato Fatiado', marca: 'Laticínios / TACO', calorias: 360.0, proteinas: 23.0, carboidratos: 1.5, gorduras: 29.0, fonte: 'TACO_LOCAL' },
  { nome: 'Queijo Cottage Tradicional', marca: 'Verde Campo / TACO', calorias: 98.0, proteinas: 11.0, carboidratos: 3.4, gorduras: 4.3, fonte: 'TACO_LOCAL' },
  { nome: 'Iogurte Natural Desnatado', marca: 'Nestlé', calorias: 42.0, proteinas: 4.5, carboidratos: 5.8, gorduras: 0.3, fonte: 'TACO_LOCAL' },
  { nome: 'Iogurte Natural Integral', marca: 'Nestlé', calorias: 66.0, proteinas: 3.8, carboidratos: 4.8, gorduras: 3.6, fonte: 'TACO_LOCAL' },
  { nome: 'Leite em Pó Integral Ninho', marca: 'Nestlé', calorias: 497.0, proteinas: 25.0, carboidratos: 39.0, gorduras: 27.0, fonte: 'TACO_LOCAL' },
  { nome: 'Leite em Pó Desnatado Molico', marca: 'Nestlé', calorias: 350.0, proteinas: 34.0, carboidratos: 52.0, gorduras: 0.5, fonte: 'TACO_LOCAL' },

  // Suplementos, Oleaginosas e Marcas Populares
  { nome: '100% Whey Concentrate', marca: 'Growth Supplements', calorias: 400.0, proteinas: 80.0, carboidratos: 9.0, gorduras: 5.0, fonte: 'TACO_LOCAL' },
  { nome: '100% Whey Isolate', marca: 'Growth Supplements', calorias: 365.0, proteinas: 90.0, carboidratos: 2.0, gorduras: 0.5, fonte: 'TACO_LOCAL' },
  { nome: 'Creatina Creapure 100% Pura', marca: 'Growth Supplements', calorias: 0.0, proteinas: 0.0, carboidratos: 0.0, gorduras: 0.0, fonte: 'TACO_LOCAL' },
  { nome: 'Pasta de Amendoim Integral Torrado', marca: 'Growth / Dr. Peanut', calorias: 588.0, proteinas: 28.0, carboidratos: 18.0, gorduras: 49.0, fonte: 'TACO_LOCAL' },
  { nome: '100% Pure Whey', marca: 'Probiótica', calorias: 405.0, proteinas: 76.0, carboidratos: 10.0, gorduras: 6.0, fonte: 'TACO_LOCAL' },
  { nome: '100% Whey Refil', marca: 'Max Titanium', calorias: 400.0, proteinas: 75.0, carboidratos: 11.0, gorduras: 5.5, fonte: 'TACO_LOCAL' },
  { nome: '100% Whey Gold Standard', marca: 'Optimum Nutrition', calorias: 398.0, proteinas: 78.0, carboidratos: 8.0, gorduras: 4.0, fonte: 'TACO_LOCAL' },
  { nome: 'Nescau 2.0 Achocolatado em Pó', marca: 'Nestlé', calorias: 380.0, proteinas: 3.5, carboidratos: 85.0, gorduras: 2.8, fonte: 'TACO_LOCAL' },
  { nome: 'Toddy Original Achocolatado', marca: 'PepsiCo', calorias: 400.0, proteinas: 2.0, carboidratos: 90.0, gorduras: 2.5, fonte: 'TACO_LOCAL' },
  { nome: 'Doce de Leite Tradicional', marca: 'Itambé / Aviação', calorias: 306.0, proteinas: 6.0, carboidratos: 55.0, gorduras: 7.0, fonte: 'TACO_LOCAL' },
  { nome: 'Castanha do Pará / Brasil', marca: 'Oleaginosas / TACO', calorias: 643.0, proteinas: 14.5, carboidratos: 15.1, gorduras: 63.5, fonte: 'TACO_LOCAL' },
  { nome: 'Azeite de Oliva Extra Virgem', marca: 'Gorduras / TACO', calorias: 884.0, proteinas: 0.0, carboidratos: 0.0, gorduras: 100.0, fonte: 'TACO_LOCAL' },
  { nome: 'Manteiga com Sal', marca: 'Aviação / TACO', calorias: 726.0, proteinas: 0.4, carboidratos: 0.1, gorduras: 82.4, fonte: 'TACO_LOCAL' },
];
