package com.ibtihel.app.entities;


import jakarta.persistence.*;
import lombok.*;

import java.util.Date;

@Entity
@Table(name = "receptions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Reception {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private double quantity;

    @Temporal(TemporalType.TIMESTAMP)
    private Date receptionDate;

    private String batchNumber;

    @ManyToOne
    @JoinColumn(name = "article_id")
    private Product product;
}
