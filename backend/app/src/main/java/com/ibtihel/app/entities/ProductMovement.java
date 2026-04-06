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
    @JsonIgnoreProperties({"description", "safetyStock", "stockQuantity", "unit", "shelfLife", "category"})
    private Product product;

    private double quantity;

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
}
