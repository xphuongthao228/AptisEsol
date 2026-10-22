package com.example.aptis.service;
import com.example.aptis.repository.DiscountCodeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.Locale;
@Service @RequiredArgsConstructor
public class DiscountService {
 private final DiscountCodeRepository codes;
 public record Quote(int originalAmount,int discountAmount,int amount,String discountCode) {}
 public static String normalize(String code) { return code==null ? "" : code.trim().toUpperCase(Locale.ROOT); }
 @Transactional(readOnly=true)
 public Quote quote(Integer days,String code) {
  int original=switch(days==null?0:days) {case 7->40000;case 14->75000;case 30->140000;case 60->250000;default->throw new IllegalArgumentException("Gói học không hợp lệ.");};
  String normalized=normalize(code);
  if(normalized.isEmpty()) return new Quote(original,0,original,null);
  var discount=codes.findByCode(normalized).orElseThrow(()->new IllegalArgumentException("Mã giảm giá không tồn tại."));
  Instant now=Instant.now();
  if(!discount.isActive() || now.isBefore(discount.getStartsAt()) || !now.isBefore(discount.getEndsAt())) throw new IllegalArgumentException("Mã giảm giá chưa có hiệu lực hoặc đã hết hạn.");
  long reduction="PERCENT".equals(discount.getType())?(long)original*discount.getValue()/100:discount.getValue();
  int amount=(int)Math.max(1000L,original-reduction);
  return new Quote(original,original-amount,amount,normalized);
 }
}