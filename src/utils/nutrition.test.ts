import test from 'node:test';
import assert from 'node:assert/strict';
import {
  removerAcentos,
  filterFoodsByQuery,
  calcularMetasMetabolicas,
  calcularPorcaoAlimento,
  parseFatSecretDescription,
  calcularTotaisDiarios,
} from './nutrition.ts';
import { BASE_TACO_EXPANDIDA } from '../data/tacoDatabase.ts';

test('removerAcentos strips diacritics and normalizes case', () => {
  assert.equal(removerAcentos('Brócolis Cozido'), 'brocolis cozido');
  assert.equal(removerAcentos('  Feijão Carioca  '), 'feijao carioca');
  assert.equal(removerAcentos('Maçã Fuji'), 'maca fuji');
});

test('filterFoodsByQuery finds items regardless of accents or word order', () => {
  const resultsBrocolis = filterFoodsByQuery(BASE_TACO_EXPANDIDA, 'brocolis');
  assert.ok(resultsBrocolis.length >= 2, 'Should find cooked and raw broccoli without accent');

  const resultsNescau = filterFoodsByQuery(BASE_TACO_EXPANDIDA, 'nescau');
  assert.equal(resultsNescau.length, 1);
  assert.equal(resultsNescau[0].marca, 'Nestlé');

  const resultsWheyGrowth = filterFoodsByQuery(BASE_TACO_EXPANDIDA, 'whey growth');
  assert.ok(resultsWheyGrowth.length >= 2);
});

test('calcularMetasMetabolicas computes accurate Mifflin-St Jeor TMB, GET, macros, and water', () => {
  // Male, 30yo, 75kg, 175cm, moderate (1.55), maintenance (0)
  // TMB = 10*75 + 6.25*175 - 5*30 + 5 = 750 + 1093.75 - 150 + 5 = 1698.75 -> 1699
  // GET = 1698.75 * 1.55 = 2633.06 -> 2633 kcal
  const goalsMale = calcularMetasMetabolicas({
    genero: 'm',
    idade: 30,
    peso: 75,
    altura: 175,
    atividade: 1.55,
    objetivo: 0,
  });

  assert.equal(goalsMale.tmb, 1699);
  assert.equal(goalsMale.kcal, 2633);
  assert.equal(goalsMale.prot, 150); // 75 * 2.0
  assert.equal(goalsMale.fat, 60);   // 75 * 0.8
  assert.equal(goalsMale.agua, 2625); // 75 * 35

  // Female cutting (-400 kcal)
  const goalsFemale = calcularMetasMetabolicas({
    genero: 'f',
    idade: 28,
    peso: 60,
    altura: 165,
    atividade: 1.375,
    objetivo: -400,
  });
  // TMB = 600 + 1031.25 - 140 - 161 = 1330.25
  // GET = 1330.25 * 1.375 = 1829.09 -> -400 = 1429
  assert.equal(goalsFemale.tmb, 1330);
  assert.equal(goalsFemale.kcal, 1429);
  assert.equal(goalsFemale.agua, 2100);
});

test('calcularPorcaoAlimento scales nutrition proportionally by unit weight', () => {
  const nescau = { calorias: 380, proteinas: 3.5, carboidratos: 85, gorduras: 2.8 };
  // 2 tablespoons (15g each = 30g total -> 0.3 factor)
  const porcao = calcularPorcaoAlimento(nescau, 2, 15);
  assert.equal(porcao.gramasTotais, 30);
  assert.equal(porcao.calorias, 114); // 380 * 0.3
  assert.equal(porcao.carboidratos, 25.5); // 85 * 0.3
  assert.equal(porcao.proteinas, 1.1); // 3.5 * 0.3 = 1.05 -> 1.1
});

test('parseFatSecretDescription parses Portuguese and English descriptions', () => {
  const ptDesc = 'Por 100g - Calorias: 130kcal | Gord: 6,2g | Carb: 14,0g | Prot: 4,8g';
  const parsedPt = parseFatSecretDescription(ptDesc);
  assert.deepEqual(parsedPt, {
    calorias: 130,
    gorduras: 6.2,
    carboidratos: 14,
    proteinas: 4.8,
  });

  const enDesc = 'Per 100g - Calories: 250kcal | Fat: 8.5g | Carbs: 31g | Protein: 12.4g';
  const parsedEn = parseFatSecretDescription(enDesc);
  assert.deepEqual(parsedEn, {
    calorias: 250,
    gorduras: 8.5,
    carboidratos: 31,
    proteinas: 12.4,
  });
});

test('calcularTotaisDiarios aggregates daily entries and computes remaining calories', () => {
  const diario = {
    'Café da Manhã': [
      {
        id: 1,
        categoria: 'Café da Manhã',
        nome: 'Ovo Cozido',
        marca: 'TACO',
        quantidade: 100,
        unidadeDesc: '100g',
        calorias: 146,
        proteinas: 13.3,
        carboidratos: 0.6,
        gorduras: 9.5,
      },
    ],
    Almoço: [
      {
        id: 2,
        categoria: 'Almoço',
        nome: 'Peito de Frango Grelhado',
        marca: 'TACO',
        quantidade: 200,
        unidadeDesc: '200g',
        calorias: 318,
        proteinas: 64.0,
        carboidratos: 0,
        gorduras: 5.0,
      },
    ],
  };

  const metas = { kcal: 2000, prot: 150, carb: 200, fat: 60 };
  const totais = calcularTotaisDiarios(diario, metas);

  assert.equal(totais.calorias, 464);
  assert.equal(totais.proteinas, 77.3);
  assert.equal(totais.carboidratos, 0.6);
  assert.equal(totais.gorduras, 14.5);
  assert.equal(totais.saldoKcal, 1536);
  assert.equal(totais.percentKcal, 23);
});
