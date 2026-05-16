package com.ibtihel.app.services.ml;

import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

public interface MlService {

    Map<String, Object> predictDemand(List<Double> historicalQuantities,
                                      double safetyStock,
                                      double currentQuantity);

    Map<String, Object> uploadAndTrain(MultipartFile file);
}
