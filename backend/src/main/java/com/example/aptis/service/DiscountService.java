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
 private final com.example.aptis.repository.UserRepository users;
 private final com.example.aptis.repository.DiscountRedemptionRepository redemptions;
 @org.springframework.beans.factory.annotation.Value("${app.subscription.free-trial-days:0}")
 private int freeTrialDays;
 public record Redeemed(String code,int days,java.time.LocalDateTime expiresAt) {}
 @Transactional
 public Redeemed redeem(String email,String code) {
  var account=users.findByEmailAndDeletedAtIsNull(email).orElseThrow();
  var user=users.findByIdForUpdate(account.getId()).orElseThrow();
  if(!user.isEnabled()) throw new IllegalArgumentException("Tài khoản đã bị khóa.");
  var discount=codes.findByCode(normalize(code)).orElseThrow(()->new IllegalArgumentException("Mã không tồn tại."));
  Instant instant=Instant.now();
  if(!discount.isActive() || instant.isBefore(discount.getStartsAt()) || !instant.isBefore(discount.getEndsAt())) throw new IllegalArgumentException("Mã chưa có hiệu lực hoặc đã hết hạn.");
  if(!"PRO_DAYS".equals(discount.getType())) throw new IllegalArgumentException("Đây không phải mã tặng ngày Pro.");
  if(redemptions.existsByUserIdAndDiscountId(user.getId(),discount.getId())) throw new IllegalArgumentException("Bạn đã sử dụng mã này rồi.");
  var base=java.time.LocalDateTime.now();
  if(user.getProExpiresAt()!=null && user.getProExpiresAt().isAfter(base)) base=user.getProExpiresAt();
  if(freeTrialDays>0 && user.getCreatedAt()!=null && user.getCreatedAt().plusDays(freeTrialDays).isAfter(base)) base=user.getCreatedAt().plusDays(freeTrialDays);
  user.setProExpiresAt(base.plusDays(discount.getValue()));users.save(user);
  var redemption=new com.example.aptis.entity.DiscountRedemption();
  redemption.setUserId(user.getId());redemption.setDiscountId(discount.getId());redemptions.saveAndFlush(redemption);
  return new Redeemed(discount.getCode(),discount.getValue(),user.getProExpiresAt());
 }
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
  if("PRO_DAYS".equals(discount.getType())) throw new IllegalArgumentException("Hãy đổi mã tặng ngày Pro để kích hoạt miễn phí.");
  long reduction="PERCENT".equals(discount.getType())?(long)original*discount.getValue()/100:discount.getValue();
  int amount=(int)Math.max(1000L,original-reduction);
  return new Quote(original,original-amount,amount,normalized);
 }
}