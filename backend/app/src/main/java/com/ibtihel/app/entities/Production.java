package com.ibtihel.app.entities;

import jakarta.persistence.*;
import lombok.*;
import com.ibtihel.app.entities.ProductionStatus;

import java.time.LocalDateTime;

@Entity
@Table(name = "productions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Production {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDateTime productionDate;

    private Double producedQuantity;

    @ManyToOne
    @JoinColumn(name = "product_id")
    private Product product;

    @ManyToOne
    @JoinColumn(name = "stock_id")
    private Stock stock;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ProductionStatus status = ProductionStatus.PLANIFIEE;

    @Column(name = "notes", length = 500)
    private String notes;

    /** ID du mouvement WO généré automatiquement lors de la réalisation. */
    @Column(name = "generated_movement_id")
    private Long generatedMovementId;

    public ProductionStatus getStatus() { return status; }
    public void setStatus(ProductionStatus status) { this.status = status; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public Long getGeneratedMovementId() { return generatedMovementId; }
    public void setGeneratedMovementId(Long generatedMovementId) { this.generatedMovementId = generatedMovementId; }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public LocalDateTime getProductionDate() {
        return productionDate;
    }

    public void setProductionDate(LocalDateTime productionDate) {
        this.productionDate = productionDate;
    }

    public Double getProducedQuantity() {
        return producedQuantity;
    }

    public void setProducedQuantity(Double producedQuantity) {
        this.producedQuantity = producedQuantity;
    }

    public Product getProduct() {
        return product;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    public Stock getStock() {
        return stock;
    }

    public void setStock(Stock stock) {
        this.stock = stock;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }
}

