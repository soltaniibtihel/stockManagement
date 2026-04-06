package com.ibtihel.app.entities;

import jakarta.persistence.*;
import lombok.*;

import java.util.Date;

@Entity
@Table(name = "stock_movements")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Enumerated(EnumType.STRING)
    private MovementType type;
    private double quantity;

    @Temporal(TemporalType.TIMESTAMP)
    private Date date;

    private String reason;

    @ManyToOne
    @JoinColumn(name = "product_id")
    private Product product;
}

