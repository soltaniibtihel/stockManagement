package com.ibtihel.app.services.ml;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.*;

@Service
public class MlServiceImpl implements MlService {

    private final RestTemplate restTemplate;

    @Value("${ml.service.url:http://localhost:8001}")
    private String mlServiceUrl;

    public MlServiceImpl(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @Override
    public Map<String, Object> predictDemand(List<Double> historicalQuantities,
                                              double safetyStock,
                                              double currentQuantity) {
        // Compute features from historical data
        double movingAvg = historicalQuantities.stream()
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0.0);

        double consumption = 0.0;
        if (historicalQuantities.size() >= 2) {
            double last  = historicalQuantities.get(historicalQuantities.size() - 1);
            double first = historicalQuantities.get(0);
            consumption  = Math.abs(last - first) / (historicalQuantities.size() - 1);
        }

        LocalDate today = LocalDate.now();

        Map<String, Object> mlRequest = new HashMap<>();
        mlRequest.put("month",        today.getMonthValue());
        mlRequest.put("day_of_week",  today.getDayOfWeek().getValue() - 1); // 0=Mon
        mlRequest.put("moving_avg",   movingAvg);
        mlRequest.put("consumption",  consumption);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(mlRequest, headers);

        @SuppressWarnings("unchecked")
        Map<String, Object> mlResponse = restTemplate.postForObject(
                mlServiceUrl + "/predict", entity, Map.class);

        if (mlResponse == null) {
            throw new RuntimeException("Empty response from ML service");
        }

        double predictedDemand = ((Number) mlResponse.get("predicted_demand")).doubleValue();
        double optimizedStock  = predictedDemand + safetyStock;
        double suggested       = Math.max(0, optimizedStock - currentQuantity);
        boolean highPriority   = suggested > currentQuantity * 0.5;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("predicted_demand",             Math.round(predictedDemand * 100.0) / 100.0);
        result.put("calculated_moving_avg",        Math.round(movingAvg * 100.0) / 100.0);
        result.put("calculated_consumption",       Math.round(consumption * 100.0) / 100.0);
        result.put("optimized_stock",              Math.round(optimizedStock * 100.0) / 100.0);
        result.put("suggested_replenishment",      Math.round(suggested * 100.0) / 100.0);
        result.put("is_reorder_highly_recommended", highPriority);
        return result;
    }

    @Override
    public Map<String, Object> uploadAndTrain(MultipartFile file) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            ByteArrayResource fileResource = new ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return file.getOriginalFilename();
                }
            };

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", fileResource);

            HttpEntity<MultiValueMap<String, Object>> entity = new HttpEntity<>(body, headers);

            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(
                    mlServiceUrl + "/train", entity, Map.class);

            return response != null ? response : Collections.singletonMap("status", "no response");
        } catch (Exception e) {
            throw new RuntimeException("Failed to forward file to ML service: " + e.getMessage(), e);
        }
    }
}
