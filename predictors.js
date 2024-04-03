// predictors.js - secondary script called by the main maxent modeling script

var Grid = ee.FeatureCollection("users/alirio/Grid_1x1km_PNM-N_WGS84_Mercartor");
var img_vazia = ee.Image(0);
  
  
// _______ For each year ________

exports.variables = function(year) {

var Nextyear = ee.Number(year).add(1);

  var imgYear = img_vazia.set('Year', year).select();

  // ______ AAB ______

  var datasetFire = ee.ImageCollection('MODIS/061/MCD64A1');

  // Function to read image year and add as band
    datasetFire = datasetFire.map(function addYear(img) {
      var diaAno = img.select('BurnDate').divide(365);
      var imgYear = (ee.Image(img.date().get('year')).add(diaAno).rename('Year')).float();
      var Mask = img.select('BurnDate');
      var Adjusted_value = Mask.gte(1).rename('AAB');
      return img.addBands(Adjusted_value, null, true).addBands(imgYear);
    });

  var datasetFireAAB = datasetFire.filter(ee.Filter.calendarRange(year, year, 'year')); 
    
    var AAB_year = datasetFireAAB.max();

    // Add the mean of each image as new properties of each feature.
    var AAB_means = AAB_year.reduceRegions({
      collection: Grid,
      reducer: ee.Reducer.max(),
      scale: datasetFire.first().projection().nominalScale(), //Product scale
      crs: datasetFire.first().projection() //Product native scale
    }).filter(ee.Filter.notNull(['AAB']));
  

    // Feature to Image
    var AAB_1km = AAB_means.reduceToImage({
      properties: ['AAB'],
      reducer: ee.Reducer.mean()
    });
  
    // add mean as band in the final result image
    imgYear = imgYear.addBands(AAB_1km.select('mean').unmask(0).rename('AAB'), null);


  // ______ EVI ______
  
  
  var datasetEVI = ee.ImageCollection("MODIS/061/MOD13Q1") //available from the year 2000-02-18 (MOD13Q1.061)
    .filter(ee.Filter.calendarRange(year, year, 'year'));
            
  // ___ apply quality mask _ and _ scaling factors__

  datasetEVI = datasetEVI.map(function(image) {
    var QA = image.select('SummaryQA');
    var mask = QA.lte(0);
    var valor_ajustado = image.select('EVI').multiply(0.0001);
    return image.addBands(valor_ajustado, null, true).updateMask(mask);
  });

  var datasetEVImean = datasetEVI.mean();

    //comput means on grid
    var EVI_means = datasetEVImean.reduceRegions({
      collection: Grid,
      reducer: ee.Reducer.mean(),
      scale: datasetEVI.first().projection().nominalScale(), //Product scale
      crs: datasetEVI.first().projection() //Product native scale
    }).filter(ee.Filter.notNull(['EVI']));

    // Feature to Image
    var EVI_1km = EVI_means.reduceToImage({
      properties: ['EVI'],
      reducer: ee.Reducer.mean()
    });
  
    // add mean as band in the final result image
    imgYear = imgYear.addBands(EVI_1km.select('mean').rename('EVI'), null);


  // ______ LST Day ______ daily
  

  var datasetLST = ee.ImageCollection("MODIS/061/MOD11A1")
    .filter(ee.Filter.calendarRange(year, year, 'year'));

  // ___ Function to apply quality mask __

  var datasetLSTd = datasetLST.map(function(image) {
    var QC_Day = image.select('QC_Day').bitwiseAnd(3)//.unmask();
    var mask = QC_Day.eq(0);
    var Adjusted_value = image.select('LST_Day_1km').multiply(0.02).subtract(273.15);
    return image.addBands(Adjusted_value, null, true).updateMask(mask);
  });

  datasetLSTd = datasetLSTd.mean();

    // Add the mean of each image as new properties of each feature.
    var LSTd_means = datasetLSTd.reduceRegions({
      collection: Grid,
      reducer: ee.Reducer.mean(),
      scale: datasetLST.first().projection().nominalScale(), //Product scale
      crs: datasetLST.first().projection() //Product native projection
    }).filter(ee.Filter.notNull(['LST_Day_1km']));

  
    // Feature to Image
    var LSTd_1km = LSTd_means.reduceToImage({
      properties: ['LST_Day_1km'],
      reducer: ee.Reducer.mean()
    });
  
    // add mean as band in the final result image
    imgYear = imgYear.addBands(LSTd_1km.select('mean').rename('LST_Day'), null);
  

  // ______ LST night ______
  
  var datasetLSTn = datasetLST.map(function(image) {
  var QCn = image.select('QC_Night').bitwiseAnd(3).unmask();
  var mask = QCn.eq(0);
  var Adjusted_value = image.select('LST_Night_1km').multiply(0.02).add(0).subtract(273.15);
  return image.addBands(Adjusted_value, null, true).updateMask(mask);
});
  
    datasetLSTn = datasetLSTn.mean();

    // Add the mean of each image as new properties of each feature.

    var LSTn_means = datasetLSTn.reduceRegions({
      collection: Grid,
      reducer: ee.Reducer.mean(),
      scale: datasetLST.first().projection().nominalScale(), //Product scale
      crs: datasetLST.first().projection() //Product native projection
    }).filter(ee.Filter.notNull(['LST_Night_1km']));
  
  
    // Feature to Image

    var LSTn_1km = LSTn_means.reduceToImage({
      properties: ['LST_Night_1km'],
      reducer: ee.Reducer.mean()
    });
  
    // add mean as band in the final result image
    imgYear = imgYear.addBands(LSTn_1km.select('mean').rename('LST_Night'), null);
  

  // ______ SR ______
  
  
  var datasetSR = ee.ImageCollection("MODIS/061/MOD09Q1")
    .filter(ee.Filter.calendarRange(year, year, 'year')); //avaible from the year 2000-02-18 (MOD09Q1.061)

    // ___ apply quality mask _ and _ scaling factors__

  datasetSR = datasetSR.map(function(image) {
    var QA = image.select('QA').bitwiseAnd(3);
    var Mask = QA.eq(0);
    var valor_ajustado = image.select('sur_refl_b01').multiply(0.0001);
    return image.addBands(valor_ajustado, null, true).updateMask(Mask);
  });

    var datasetSRmean = datasetSR.mean();
 
    // Add the mean of each image as new properties of each feature.
    var SR_means = datasetSRmean.reduceRegions({
      collection: Grid,
      reducer: ee.Reducer.mean(),
      scale: datasetSR.first().projection().nominalScale(), //Product scale
      crs: datasetSR.first().projection() //Product native scale
    }).filter(ee.Filter.notNull(['sur_refl_b01']));

    // Feature to Image

    var SR_1km = SR_means.reduceToImage({
      properties: ['sur_refl_b01'],
      reducer: ee.Reducer.mean()
    });

    // add mean as band in the final result image
    imgYear = imgYear.addBands(SR_1km.select('mean').rename('SR'), null);


  // ______ TSF ______

  datasetFire = datasetFire.filter(ee.Filter.calendarRange(2000, year, 'year')); 
  
    // Function to calculate TimeSinceFire (years, with decimal)

    var TSF_year = datasetFire.map(function(image) {
      var subtraction = image.select('Year').subtract(Nextyear).multiply(-1).rename('TimeSinceFire');
      return image.addBands(subtraction);
    });

    var TSF = TSF_year.min();

    // Add the mean of each image as new properties of each feature.

    var TSF_means = TSF.reduceRegions({
      collection: Grid,
      reducer: ee.Reducer.mean(),
      scale: datasetFire.first().projection().nominalScale(), //Product scale
      crs: datasetFire.first().projection() //Product native scale
    }).filter(ee.Filter.notNull(['TimeSinceFire']));

  
    // Feature to Image

    var TSF_1km = TSF_means.reduceToImage({
      properties: ['TimeSinceFire'],
      reducer: ee.Reducer.mean()
    });

    // add mean as band in the final result image
    imgYear = imgYear.addBands(TSF_1km.select('mean').unmask(22).rename('TSF'), null);
  

  return imgYear;
};
