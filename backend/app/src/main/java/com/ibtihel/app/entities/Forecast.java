package com.ibtihel.app.entities;

import jakarta.persistence.*;
import lombok.*;

import java.util.Date;

@Entity
@Table(name = "forecasts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Forecast {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String period;
    private double predictedDemand;
    private double confidenceLevel;

    @Temporal(TemporalType.TIMESTAMP)
    private Date generatedDate;

    @ManyToOne
    @JoinColumn(name = "product_id")
    private Product product;
}

