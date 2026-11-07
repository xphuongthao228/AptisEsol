package com.example.aptis.entity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
@Getter @Setter @Entity
@Table(name="discount_redemptions",uniqueConstraints=@UniqueConstraint(columnNames={"user_id","discount_id"}))
public class DiscountRedemption extends BaseEntity {
 @Column(name="user_id",nullable=false) private Long userId;
 @Column(name="discount_id",nullable=false) private Long discountId;
}
