package com.ibtihel.app.entities;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity
@Table(name = "product_movements")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "product_id", nullable = false)
    @JsonIgnoreProperties({"description", "unit", "shelfLife", "category"})
    private Product product;

    private Double quantity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProductMovementType type;

    private LocalDate date;

    @OneToOne(mappedBy = "productMovement", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnoreProperties("productMovement")
    private ProductMovementDetail detail;

    @PrePersist
    protected void onCreate() {
        if (date == null) {
            date = LocalDate.now();
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }
    
    public Double getQuantity() { return quantity; }
    public void setQuantity(Double quantity) { this.quantity = quantity; }
    
    public ProductMovementType getType() { return type; }
    public void setType(ProductMovementType type) { this.type = type; }
    
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }
    
    public ProductMovementDetail getDetail() { return detail; }
    public void setDetail(ProductMovementDetail detail) { 
        this.detail = detail; 
        if (detail != null) {
            detail.setProductMovement(this);
        }
    }
}
