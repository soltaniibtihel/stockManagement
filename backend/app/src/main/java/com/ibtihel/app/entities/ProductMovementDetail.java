package com.ibtihel.app.entities;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "product_movement_details")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductMovementDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "product_movement_id", nullable = false)
    @JsonIgnoreProperties("detail")
    private ProductMovement productMovement;

    private double unitPrice;

    private double totalPrice;
}
