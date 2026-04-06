package com.ibtihel.app.entities;

import jakarta.persistence.*;
import lombok.*;

import java.util.Date;

@Entity
@Table(name = "replenishment_recommendations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReplenishmentRecommendation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private double recommendedQuantity;

    @Enumerated(EnumType.STRING)
    private RecommendationStatus status; // PENDING / APPROVED / REJECTED

    @Temporal(TemporalType.TIMESTAMP)
    private Date createdDate;

    @ManyToOne
    @JoinColumn(name = "product_id")
    private Product product;

    @OneToOne
    @JoinColumn(name = "forecast_id")
    private Forecast forecast;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;
}
