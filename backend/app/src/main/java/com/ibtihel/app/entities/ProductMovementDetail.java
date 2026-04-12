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

    private Double unitPrice;

    private Double totalPrice;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public ProductMovement getProductMovement() { return productMovement; }
    public void setProductMovement(ProductMovement productMovement) { this.productMovement = productMovement; }
    
    public Double getUnitPrice() { return unitPrice; }
    public void setUnitPrice(Double unitPrice) { this.unitPrice = unitPrice; }
    
    public Double getTotalPrice() { return totalPrice; }
    public void setTotalPrice(Double totalPrice) { this.totalPrice = totalPrice; }
}
