package com.example.aptis.controller;
import com.example.aptis.dto.ApiResponse;
import com.example.aptis.entity.DiscountCode;
import com.example.aptis.repository.DiscountCodeRepository;
import com.example.aptis.service.DiscountService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.List;
@RestController @RequestMapping("/api/discounts") @RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class DiscountController {
 private final DiscountCodeRepository codes;
 private final DiscountService discounts;
 private final com.example.aptis.service.PaymentService payments;
 public record ApplyRequest(@NotBlank @Size(max=40) String code, @NotNull Integer days) {}
 public record AppliedCode(String type, DiscountService.Quote quote, DiscountService.Redeemed gift) {}
 @PostMapping("/apply") @PreAuthorize("isAuthenticated()")
 public ApiResponse<AppliedCode> apply(org.springframework.security.core.Authentication auth, @Valid @RequestBody ApplyRequest request) {
  String code = DiscountService.normalize(request.code());
  boolean gift = codes.findByCode(code).map(item -> "PRO_DAYS".equals(item.getType())).orElse(false);
  if (gift) return ApiResponse.ok(new AppliedCode("PRO_DAYS", null, discounts.redeem(auth.getName(), code)));
  if (request.days() <= 0) throw new IllegalArgumentException("Chọn gói trả phí để áp dụng mã giảm giá hoặc mã giới thiệu.");
  return ApiResponse.ok(new AppliedCode("PAYMENT", payments.quote(auth.getName(), request.days(), code), null));
 }
 public record RedeemRequest(@NotBlank @Size(max=40) String code) {}
 @PostMapping("/redeem") @PreAuthorize("isAuthenticated()")
 public ApiResponse<DiscountService.Redeemed> redeem(org.springframework.security.core.Authentication auth,@Valid @RequestBody RedeemRequest request){return ApiResponse.ok(discounts.redeem(auth.getName(),request.code()));}

 public record AvailableDiscount(String code, String type, Integer value, Instant endsAt) {}
 @GetMapping("/available") @PreAuthorize("isAuthenticated()")
 public ApiResponse<List<AvailableDiscount>> available(){
  Instant now = Instant.now();
  return ApiResponse.ok(codes.findByActiveTrueAndStartsAtLessThanEqualAndEndsAtGreaterThanOrderByEndsAtAsc(now, now)
   .stream().filter(item -> !"PRO_DAYS".equals(item.getType())).map(item -> new AvailableDiscount(item.getCode(), item.getType(), item.getValue(), item.getEndsAt())).toList());
 }
 public record DiscountRequest(@NotBlank @Pattern(regexp="[A-Za-z0-9_-]{2,40}") String code,@NotBlank String type,@NotNull @Min(1) Integer value,@NotNull Instant startsAt,@NotNull Instant endsAt,boolean active) {}
 @GetMapping public ApiResponse<List<DiscountCode>> list(){return ApiResponse.ok(codes.findAll(org.springframework.data.domain.Sort.by("id").descending()));}
 @PostMapping @Transactional public ApiResponse<DiscountCode> create(@Valid @RequestBody DiscountRequest r){return save(new DiscountCode(),r);}
 @PutMapping("/{id}") @Transactional public ApiResponse<DiscountCode> update(@PathVariable Long id,@Valid @RequestBody DiscountRequest r){return save(codes.findById(id).orElseThrow(()->new IllegalArgumentException("Không tìm thấy mã.")),r);}
 private ApiResponse<DiscountCode> save(DiscountCode item,DiscountRequest r){
  if(!List.of("PERCENT","FIXED","PRO_DAYS").contains(r.type()) || ("PERCENT".equals(r.type()) && r.value()>99)) throw new IllegalArgumentException("Phần trăm phải từ 1 đến 99.");
  if("PRO_DAYS".equals(r.type()) && r.value()>3650) throw new IllegalArgumentException("Số ngày Pro phải từ 1 đến 3650.");
  if(!r.endsAt().isAfter(r.startsAt())) throw new IllegalArgumentException("Ngày kết thúc phải sau ngày bắt đầu.");
  String code=DiscountService.normalize(r.code());
  if(code.startsWith("REF")) throw new IllegalArgumentException("Tiền tố REF dành cho mã giới thiệu.");
  codes.findByCode(code).ifPresent(existing->{if(!existing.getId().equals(item.getId())) throw new IllegalArgumentException("Mã giảm giá đã tồn tại.");});
  item.setCode(code);item.setType(r.type());item.setValue(r.value());item.setStartsAt(r.startsAt());item.setEndsAt(r.endsAt());item.setActive(r.active());
  return ApiResponse.ok(codes.save(item));
 }
}
