package com.ibtihel.app.services.ml;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.util.UriComponentsBuilder;

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
    public Map<String, Object> predictYear(String productCode) {
        UriComponentsBuilder uri = UriComponentsBuilder
                .fromUriString(mlServiceUrl + "/predict-year");

        if (productCode != null && !productCode.isBlank()) {
            uri.queryParam("product_code", productCode);
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> response = restTemplate.getForObject(uri.toUriString(), Map.class);

        if (response == null) {
            throw new RuntimeException("Empty response from ML service");
        }
        return response;
    }

    @Override
    public Map<String, Object> chat(String message) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, String> body = Map.of("message", message);
            HttpEntity<Map<String, String>> entity = new HttpEntity<>(body, headers);

            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(
                    mlServiceUrl + "/chat", entity, Map.class);

            return response != null ? response : Map.of("response", "Aucune réponse du service ML.");
        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de l'appel au chatbot ML : " + e.getMessage(), e);
        }
    }

    @Override
    public Map<String, Object> uploadAndTrain(MultipartFile file) {
        return forwardFileToMlService(file, "/train");
    }

    /**
     * Transmet le fichier Excel au service Python /compare-rf-xgb.
     *
     * Le service Python :
     *   1. Entraîne Random Forest sur les données
     *   2. Entraîne XGBoost sur les mêmes données
     *   3. Compare les métriques R², RMSE, MAE
     *   4. Sauvegarde le meilleur modèle comme modèle actif
     *   5. Retourne les métriques des deux modèles + le gagnant
     */
    @Override
    public Map<String, Object> compareRfXgb(MultipartFile file) {
        return forwardFileToMlService(file, "/compare-rf-xgb");
    }

    /**
     * Méthode utilitaire : envoie un fichier multipart au service Python ML.
     *
     * @param file      fichier Excel à transmettre
     * @param endpoint  chemin de l'endpoint Python (ex. "/train", "/compare-rf-xgb")
     * @return réponse JSON du service Python
     */
    private Map<String, Object> forwardFileToMlService(MultipartFile file, String endpoint) {
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
                    mlServiceUrl + endpoint, entity, Map.class);

            return response != null ? response : Collections.singletonMap("status", "no response");
        } catch (Exception e) {
            throw new RuntimeException(
                    "Failed to forward file to ML service [" + endpoint + "]: " + e.getMessage(), e);
        }
    }
}
