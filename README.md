# Montobeo

### Scripts used in GEE

Habitat trends in the Special Area of Conservation of Montesinho/Nogueira are calculated with three scripts:
- The main script - **montrends_1_spec** - implements MaxEnt modeling and calculates the Sen SLope of the trends;
- **predictors.js** is called by the main script to obtain the predictor variables;
- **kendallPValue.js** is called to calculate the p-value of the trends.

These scripts are also used in the **GEE App - Montrends**.
Programming language is javascript, used to interact with the GEE platform.



### HS Trend Analysis - R script

R script - **HS_Trend Analysis.R** - used to analyze the results of habitat suitability trends found in the Montobeo project
