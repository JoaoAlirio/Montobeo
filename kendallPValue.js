// Secondary script called by the main maxent modeling script
// script adapted from: developers.google.com/earth-engine/tutorials/community/nonparametric-trends

exports.mk_results = function(coll) {

//////// Join the time series to itself

var afterFilter = ee.Filter.lessThan({
  leftField: 'Year',
  rightField: 'Year'
});

var joined = ee.ImageCollection(ee.Join.saveAll('after').apply({
  primary: coll,
  secondary: coll,
  condition: afterFilter
}));

//////// kendall Sign

// Output = 0 if the input = 0, 1 if input > 0, -1 if < 0.
var sign = function(i, j) {   // i and j are images
  return j.subtract(i).signum(); // different from the tutorial
};

var kendall = ee.ImageCollection(joined.map(function(current) {
  var afterCollection = ee.ImageCollection.fromImages(current.get('after'));
  return afterCollection.map(function(image) {
    return ee.Image(sign(current, image)).unmask(0); // unmask to prevent accumulation of masked pixels
  });
}).flatten()).reduce('sum', 2); // Set parallelScale to avoid User memory limit exceeded.


////// Variance of the Mann-Kendall statistic

var factors = function(image) {
  return image.expression('b() * (b() - 1) * (b() * 2 + 5)');
};

var count = joined.count();
var kendallVariance = factors(count).divide(18).float();

// Compute Z-statistics.
var zero = kendall.multiply(kendall.eq(0));
var pos = kendall.multiply(kendall.gt(0)).subtract(1);
var neg = kendall.multiply(kendall.lt(0)).add(1);

var z = zero
    .add(pos.divide(kendallVariance.sqrt()))
    .add(neg.divide(kendallVariance.sqrt()));

// https://en.wikipedia.org/wiki/Error_function#Cumulative_distribution_function
function eeCdf(z) {
  return ee.Image(0.5)
      .multiply(ee.Image(1).add(ee.Image(z).divide(ee.Image(2).sqrt()).erf()));
}

// Compute P-values.

var p = ee.Image(1).subtract(eeCdf(z.abs())).rename('pValue');

return (p);
};
