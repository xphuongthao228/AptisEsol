package com.example.aptis.entity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
@Getter @Setter @Entity @Table(name="discount_codes")
public class DiscountCode extends BaseEntity {
 @Column(nullable=false,unique=true,length=40) private String code;
 @Column(nullable=false) private String type;
 @Column(name="discount_value",nullable=false) private Integer value;
 @Column(nullable=false) private Instant startsAt;
 @Column(nullable=false) private Instant endsAt;
 @Column(nullable=false) private boolean active;
}