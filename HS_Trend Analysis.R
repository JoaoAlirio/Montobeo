# packages
library(terra)
library(sf)
library(tidyverse)

setwd("C:/Users/ifine/OneDrive/Área de Trabalho/MontObEO/Modelacao_Fase_3/")

# Import raster stack of each taxonomic group 
mammals <- rast("Resultados/img_results_f3/MontObEO_f3_Mammals.tif")
amphibians <- rast("Resultados/img_results_f3/MontObEO_f3_Amphibians.tif")
reptiles <- rast("Resultados/img_results_f3/MontObEO_f3_Reptiles.tif")
birds <- rast(list.files("Resultados/img_results_f3/Birds/",
                         full.names = T))
plants <- rast(list.files("Resultados/img_results_f3/Plants/",
                          full.names = T))


# Import species occurrences
occ <- st_read("Data/species_modelling_2024_07_15.gpkg")

# Use occurrences to mask rasters by the species distributions
list_taxa <- list("Mammals" = mammals,
                  "Amphibians" = amphibians,
                  "Reptiles" = reptiles,
                  "Birds" = birds,
                  "Flora" = plants)

study_area <- mammals$"0_0_2001_Canis_lupus" # example raster to use in project

for(i in names(list_taxa)){
  occ_taxa <- occ %>%
    filter(Taxonomic == i)
  species <- unique(occ_taxa$Species)
  rst_taxa <- list_taxa[[i]]
  rst_new <- rast()
  for(j in species){
    occ_sp <- occ_taxa %>%
      filter(Species == j)
    occ_sp_spat <- vect(occ_sp)
    
    rst_sp <- rst_taxa[j]
    rst_sp_cut <- terra::crop(rst_sp, occ_sp_spat, mask = T)
    rst_sp_cut <- project(rst_sp_cut, study_area)
    rst_new <- c(rst_new, rst_sp_cut)
    
  }
  assign(paste0(i,"_cut"), rst_new)
}

# Save results
writeRaster(Mammals_cut,"Resultados/img_results_f3/Mammals_cut.tif")
writeRaster(Amphibians_cut,"Resultados/img_results_f3/Amphibians_cut.tif")
writeRaster(Reptiles_cut,"Resultados/img_results_f3/Reptiles_cut.tif")
writeRaster(Birds_cut,"Resultados/img_results_f3/Birds_cut.tif")
writeRaster(Flora_cut,"Resultados/img_results_f3/Flora_cut.tif")


#### obtain HS trends for individual species and groups

var <- Birds_cut # replace here the group you want to analyse (taxonomic, functional, )
slope <- var["slope"] # obtain trends
pvalue <- var["pValue"] # obtain pvalue of trends test
pvalue[pvalue > 0.05] <- NA # exclude pixel with nonsign trends
plot(pvalue)
m <- mask(slope, pvalue) 
rmean <- mean(m, na.rm = T) # calculate group mean 
rsd <- stdev(m, na.rm = T) # calculate group sd
writeRaster(rmean, "slope_mean.tif", overwrite=TRUE)
writeRaster(rsd, "slope_sd.tif", overwrite=TRUE)
plot(rmean)
plot(rsd)

# calculate number of pixels with negative trends for each individual species
rc2 <- classify(m, c(-1, 0, 1), include.lowest=TRUE, brackets=TRUE)
recl.1 <- as.data.frame(freq(rc2))
write.csv(recl.1, "C:/Users/ifine/OneDrive/Área de Trabalho/MontObEO/Modelacao_Fase_3/Resultados/Trends.csv", row.names=FALSE)

# calculate number of pixels with negative trend for each group
rc2 <- classify(rmean, c(-1, 0, 1), include.lowest=TRUE, brackets=TRUE)
freq(rc2)