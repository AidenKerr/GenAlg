var express = require('express');
var router = express.Router();

// require DeltaE package
var DeltaE = require('delta-e');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Colony Collapse Disorder' });
  res.end();
});

router.get('/start', function(req, res, next) {
  res.render('start', { title: 'Colony Collapse Disorder', x: alg("normal")});
  res.end();
});


// ALGORITHM CODE

var maxAB = 127; // max value of A and B components of LAB colorspace. (TODO verify this)

function alg(mode) {
  // initialization
  popSize = 100;
  switch (mode) {
    case "bee":
      var pop = generateStartingPop("bee");
      break;
    default:
    var pop = generateStartingPop("normal");
  }
  var niche = newColor();
  var threshold = 5; // arbitrary threshold value (death cutoff);
  var max_reps = 600; // to prevent infinite loops

  calculateFitness(pop, niche);

  displayPop(pop, niche, mode);


  if (mode == "bee") {
    // Queen bees mate with only 12-15 bees
    // then keep their genetic info for life
    while (! converged(pop) && pop.generations < max_reps) {
      //displayPop(pop, niche, mode);
      pop = death(pop, threshold);
      pop = beeSelection(pop);
      pop = beeCrossover(pop);
      pop = mutation(pop);
      calculateFitness(pop, niche);
      pop = updateCounter(pop);
    }
  } else {
    // loop until pop converges or max loops is reached
    while (! converged(pop) && pop.generations < max_reps) {
      //displayPop(pop, niche, mode);
      pop = death(pop, threshold);
      pop = crossover(selection(pop));
      pop = mutation(pop);
      calculateFitness(pop, niche);
      pop = updateCounter(pop);
    }
  }

  // message to be displayed on screen
  var message = "fitness: ";
  for (var i = 0; i < pop.individuals.length; i++) {
    message = message + i.toString() + ": " + pop.individuals[i].fitness + ", ";
  }
  displayPop(pop, niche, mode);
  //return message;

  var data = fitnessData(pop);
  return data;
}


function newColor() {
  var L = random(0, 100, 1, 0); // random value from 0 to 100
  var A = random(-maxAB, maxAB, 1, 0); // random value from -maxAB to maxAB
  var B = random(-maxAB, maxAB, 1, 0);
  return {L: L, A: A, B: B};
}

// Generates random population with num individuals
function generateStartingPop(mode) {
  var population = {};
  population.generations = 0;
  var individuals = [];
  if (mode == "bee") {
    // the genetic info in the Queen bee
    population.geneticInfo = [];
  }
  for (var i = 0; i < popSize; i++) {
    var individual = {};
    individual.color = newColor();
    individual.fitness = 0; // initial fitness
    individuals.push(individual);
  }
  population.individuals = individuals;
  return population;
}

function calculateFitness(pop, niche) {
  for (var i = 0; i < pop.individuals.length; i++) {
    var fitness = DeltaE.getDeltaE00(pop.individuals[i].color, niche);
    // I want a large fitness to indicate similarity to the niche
    // DeltaE gives a small value for similarity
    // This should fix it:
    fitness = 100 - fitness ;
    pop.individuals[i].fitness = fitness;
  }
}

// return true if population is similar to the niche
function converged() {
  return false; // TODO
}

// remove values below threshold
function death(pop, threshold) {
  pop.individuals = pop.individuals.filter(indv => indv.fitness > threshold);
  return pop;
}

// return pairs of individuals
function selection(pop) {

  var selection = {};
  selection.generations = pop.generations; // carry over gen counter for future use
  selection.pairs = [];
  var indvs = pop.individuals;
  // more fit -> more likely to breed
  // pop breeds until popSize is full

  for (i = 0; i < popSize; i++) {
    var pair = [];

    pair.push(randWeightedIndv(indvs));

    // ensure an individual is not paired with itself
    do {
      var nextPair = randWeightedIndv(indvs);
      pair[1] = nextPair;
    } while (nextPair == pair[0]);

    selection.pairs.push(pair);
  }

  return selection;
}

// This function mimics bee mating.
function beeSelection(pop) {
  /*
      In reality, queen bees "mate" about once and keep their genetic info for life.
      In this model, There is a new queen every generation.
      The reason is because we want to compare bee mating to normal mating.
      If the model had the queen mate once and get replaced every n generations, it
      would look like they only breed every n generation. Obviously this would look
      slower than the normal breeding method. We want to see if the limited genetic
      pool makes a difference, independent of how often the queen is replaced.
  */
  var indvs = pop.individuals;
  var info = [];

  for (var i = 0; i < 16; i++) {
    // The first bee in this list is treated like the queen
    // ensure an individual is not already in the genetic info
    var nextInfo;
    do {
      nextInfo = randWeightedIndv(indvs);
    } while (info.includes(nextInfo));
    info.push(nextInfo);
  }
  pop.geneticInfo = info;
  return pop;
}

// returns an individual randomly based on their fitness
function randWeightedIndv(indvs) {
  // sum of fitness
  var indvsFitness = indvs.map(x => x.fitness);
  var weightSums = indvsFitness.reduce((acc, crnt) => acc + crnt);
  var randNum = random(0, weightSums, 1, 0); // random value from 0 to weightSums

  for (j = 0; j < indvs.length; j++) {
    if (randNum < indvs[j].fitness) {
      return indvs[j];
    }
    randNum -= indvs[j].fitness;
  }
  // if loop ends with no return, return last element
  return indvs[indvs.length - 1];
}

/*
    TODO: Crossover and beeCrossover
    Right now, crossover can cause numbers out of range.
    For example 094+123 -> 194
    Fix this!
*/

// cross genes in pair
function crossover(sel) {
  var nextPop = {};
  var indvs = [];
  nextPop.generations = sel.generations;

  for (var i = 0; i < sel.pairs.length; i++) {
    indvs.push(mate(sel.pairs[i]));
  }

  nextPop.individuals = indvs;
  return nextPop;
}

function beeCrossover(pop) {
  var indvs = [];
  var genInf = pop.geneticInfo;
  var queen = genInf[0];

  var max = genInf.length - 1; // bees in genInf minus the queen
  var min = 1;

  for (var i = 0; i < popSize; i++) {
    var rand = random(min, max, 1, 0);
    var selectedInf = genInf[rand];
    indvs.push(mate([queen, selectedInf]));
  }

  pop.individuals = indvs;
  return pop;
}

function mate(pair) {
  var mommy = pair[0]; // "mommy" and "daddy" have no meaning
  var daddy = pair[1]; // an individual could be either - it doesn't matter
  var baby = {};

  /*  Convert all color values to string, pad with 0s to reach 3 digits, and add signs.
      Then concatenate strings (lengths 3+4+4=11 zero indexed so length = 10).
      CrossPnt chooses where to cross the parent's color info.
        --> from 1 to 10 to ensure baby is not the exact same as one of the parents
      Then the string will be split back into color info
  */
  var mommyGene = gene(mommy.color);
  var daddyGene = gene(daddy.color);

  var crossPnt = random(0, 9, 1, 0); // random value from 0 to 9
  var babyGene = mommyGene.substring(0, crossPnt) + daddyGene.substring(crossPnt);

  baby.color = geneToColor(babyGene);
  baby.fitness = 0;

  return baby;

}

// takes color, returns concatenates to string of length 11
function gene(color) {
  var L = pad(color.L, false);
  var A = pad(color.A, true);
  var B = pad(color.B, true);
  return L + A + B;
}

// returns num padded with 0s as a string (with +/- if sign = true)
function pad(num, sign) {
  // I'm not super happy with this function. TODO: clean it up
  var s = num.toString();
  var signVal;
  if (sign) {
    if (num > 0) {
      signVal = "+";
    } else {
      signVal = "-";
      s = s.substring(1);
    }
  }
  for (i = s.length; i < 3; i++) {
    s = "0" + s;
  }
  if (sign) {
    s = signVal + s
  }
  return s;
}

// takes gene string, converts to LAB color
function geneToColor(gene) {
  var color = {};

  L = gene.substring(0, 3);
  A = gene.substring(3, 7);
  B = gene.substring(7, 11);

  color.L = parseInt(L)
  color.A = parseInt(A)
  color.B = parseInt(B);
  return color;
}


// add random mutations to the population
function mutation(pop) {
  var mutateProb = 0.01; // probability of mutating

  for (i = 0; i < pop.individuals.length; i++) {
    var indv = pop.individuals[i];

    if (Math.random() < mutateProb) {
      // the value of color that will be mutated
      // L=0, A=1, B=2
      var mutationVal = random(0, 2, 1, 0);

      var sign = Math.random() < 0.5 ? -1 : 1; // adding or subtracting?
      var min = 0;
      var max; // to be set after num is determined

      var delta;

      switch (mutationVal) {
        case 0:
          var num = indv.color.L;
          max =  50 + sign * 50 - num;
          delta = random(min, max, 5, -0.5);
          indv.color.L = indv.color.L + delta;
          break;
        case 1:
          var num = indv.color.A;
          max = sign * maxAB - num;
          delta = random(min, max, 5, -0.5);
          indv.color.A = indv.color.A + delta;
          break;
        case 2:
          var num = indv.color.B;
          max = sign * maxAB - num
          var delta = random(min,max, 5, -0.5);
          indv.color.B = indv.color.B + delta;
          break;
      }
    }
  }

  return pop;
}

// minimun value, max value, variance, shift
// for a normal Math.random() with a set range, set v=1, s=0
function random(min, max, v, s) {

  var r = 0;
  for(var i = v; i > 0; i--){
      r += Math.random();
  }
  return Math.floor(Math.abs((r / v) + s) * (max - min + 1) ) + min;
}

// simply updates the generations counter;
function updateCounter(pop) {
  pop.generations = pop.generations + 1;
  return pop;
}

// log the population to the console for testing purposes
function displayPop(pop, niche, mode) {
  console.log("niche: " + JSON.stringify(niche));
  console.log("counter: " + JSON.stringify(pop.generations));
  if (mode == "bee") {
    console.log("genetic info: " + JSON.stringify(pop.geneticInfo));
  }
  console.log("individuals: ");
  for (var i = 0; i < pop.individuals.length; i++) {
    console.log(i.toString() + ": ");
    console.log("  Color: " + JSON.stringify(pop.individuals[i].color));
    console.log("  Fitness: " + JSON.stringify(pop.individuals[i].fitness));
  }
}

function displayPairs(sel) {
  for (i = 0; i < sel.pairs.length; i++) {
    console.log("Pair " + i.toString() + ": ");
    console.log(sel.pairs[i]);
  }
}

function fitnessData(pop) {
  var data = [];

  for (var i = 0; i < pop.individuals.length; i++) {
    data.push(pop.individuals[i].fitness);
  }

  return data;
}


module.exports = router;
