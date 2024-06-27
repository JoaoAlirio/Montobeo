// predictors.js - secondary script called by the main maxent modeling script


var grid = ee.FeatureCollection("users/alirio/Grids/grid_1km_PNM_N_epsg3763");

// _______ By year ________

exports.variables = function(year) {

var nextYear = ee.Number(year).add(1).toFloat();
var imgYear = ee.Image().set('Year', year).select();


  // ______ prepare MODIS Burned Area to AAB and TSF ______

  var datasetFire = ee.ImageCollection('MODIS/061/MCD64A1');

  // Function to read image year and add as band
    datasetFire = datasetFire.map(function addYear(img) {
      var diaAno = img.select('BurnDate').divide(365);
      var imgYear = (ee.Image(img.date().get('year')).add(diaAno).rename('Year')).float();
      var Mask = img.select('BurnDate');
      var Adjusted_value = Mask.gte(1).rename('AAB');
      return img.addBands(Adjusted_value, null, true).addBands(imgYear);
    });
    
  // ________________ AAB _______________

  // obtain later burned pixels
  var AAB_year = datasetFire
        .filter(ee.Filter.calendarRange(year, year, 'year'))
        .max()
        .setDefaultProjection(  //(re)set projection
          datasetFire.first().projection(), null,
          datasetFire.first().projection().nominalScale())
        .select('AAB');

  // Reduce Resolution to 1000m and reproject
  var meanAAB_RR = AAB_year
    .reduceResolution({reducer: ee.Reducer.mean()})
    .reproject({crs: 'EPSG:3763', scale: 1000});

  // add AAB band to imgYear, with zero on nullvalues
  imgYear = imgYear.addBands(meanAAB_RR).unmask(0);


  // _______________ EVI ________________

  var datasetEVI = ee.ImageCollection("MODIS/061/MOD13Q1")
      .filter(ee.Filter.calendarRange(year, year, 'year'));

  // ___ apply quality mask _ and _ scaling factors__
  datasetEVI = datasetEVI.map(function(image) {
    var QA = image.select('SummaryQA');
    var mask = QA.lte(0);
    var valor_ajustado = image.select('EVI').multiply(0.0001);
    return image.addBands(valor_ajustado, null, true).updateMask(mask);
  }).select('EVI');

  //compute collection average and (re)set projection
  var meanEVI = datasetEVI.mean().setDefaultProjection(
    datasetEVI.first().projection(), null,
    datasetEVI.first().projection().nominalScale()
    );

  // Reduce Resolution to 1000m and reproject
  var meanEVI_RR = meanEVI
    .reduceResolution({reducer: ee.Reducer.mean()})
    .reproject({crs: 'EPSG:3763', scale: 1000});

  // add band to imgYear
  imgYear = imgYear.addBands(meanEVI_RR);


  // ______ LST Day ______
  
  var datasetLST = ee.ImageCollection("MODIS/061/MOD11A1")
      .filter(ee.Filter.calendarRange(year, year, 'year'));

  // ___ Function to apply quality mask __
  var datasetLSTd = datasetLST.map(function(image) {
    var QC_Day = image.select('QC_Day').bitwiseAnd(3).unmask();
    var mask = QC_Day.eq(0);
    var Adjusted_value = image.select('LST_Day_1km').multiply(0.02).subtract(273.15);
    return image.addBands(Adjusted_value, null, true).updateMask(mask);
  }).select('LST_Day_1km');

  //compute collection average and (re)set projection
  var meanLSTd = datasetLSTd.mean().setDefaultProjection(
    datasetLSTd.first().projection(), null,
    datasetLSTd.first().projection().nominalScale()
    );

  // Reduce Resolution to 1000m and reproject
  var meanLSTd_RR = meanLSTd
    .reduceResolution({reducer: ee.Reducer.mean()})
    .reproject({crs: 'EPSG:3763', scale: 1000})
    .rename('LST_Day');

  // add band to imgYear
  imgYear = imgYear.addBands(meanLSTd_RR);


  // ______ LST night ______
  
  var datasetLSTn = datasetLST.map(function(image) {
  var QCn = image.select('QC_Night').bitwiseAnd(3).unmask();
  var mask = QCn.eq(0);
  var Adjusted_value = image.select('LST_Night_1km').multiply(0.02).add(0).subtract(273.15);
  return image.addBands(Adjusted_value, null, true).updateMask(mask);
  }).select('LST_Night_1km');
  
    //compute collection average and (re)set projection
  var meanLSTn = datasetLSTn.mean().setDefaultProjection(
    datasetLSTn.first().projection(), null,
    datasetLSTn.first().projection().nominalScale()
    );

  // Reduce Resolution to 1000m and reproject
  var meanLSTn_RR = meanLSTn
    .reduceResolution({reducer: ee.Reducer.mean()})
    .reproject({crs: 'EPSG:3763', scale: 1000})
    .rename('LST_Night');

  // add band to imgYear
  imgYear = imgYear.addBands(meanLSTn_RR);


  // _______________ SR __________________
  
  var datasetSR = ee.ImageCollection("MODIS/061/MOD09Q1")
    .filter(ee.Filter.calendarRange(year, year, 'year'));

    // ___ apply quality mask _ and _ scaling factors__

  datasetSR = datasetSR.map(function(image) {
    var QA = image.select('QA').bitwiseAnd(3);
    var Mask = QA.eq(0);
    var valor_ajustado = image.select('sur_refl_b01').multiply(0.0001);
    return image.addBands(valor_ajustado, null, true).updateMask(Mask);
  }).select('sur_refl_b01');


    //compute collection average and (re)set projection
  var meanSR = datasetSR.mean().setDefaultProjection(
    datasetSR.first().projection(), null,
    datasetSR.first().projection().nominalScale()
    );

  // Reduce Resolution to 1000m and reproject
  var meanSR_RR = meanSR
    .reduceResolution({reducer: ee.Reducer.mean()})
    .reproject({crs: 'EPSG:3763', scale: 1000})
    .rename('SR');

  // add band to imgYear
  imgYear = imgYear.addBands(meanSR_RR);


  // ______ TSF ______

  datasetFire = datasetFire.filter(ee.Filter.calendarRange(2000, year, 'year')); 
  
    // Function to calculate TimeSinceFire (years, with decimal)
    var TSF_year = datasetFire.map(function(image) {
      var subtraction = image.select('Year').subtract(nextYear).multiply(-1).rename('TimeSinceFire');
      return image.addBands(subtraction);
    });


    //compute collection min and (re)set projection
  var meanTSF = TSF_year.min().setDefaultProjection(
    datasetSR.first().projection(), null,
    datasetSR.first().projection().nominalScale()
    );

  // Reduce Resolution to 1000m and reproject
  var meanTSF_RR = meanTSF.select('TimeSinceFire')
    .reduceResolution({reducer: ee.Reducer.mean()})
    .reproject({crs: 'EPSG:3763', scale: 1000})
    .rename('TSF');

  // add band to imgYear
  imgYear = imgYear.addBands(meanTSF_RR).unmask(23);

// _______ end year ________

  // final results image with 6 bands
  return imgYear.clip(grid);
};
