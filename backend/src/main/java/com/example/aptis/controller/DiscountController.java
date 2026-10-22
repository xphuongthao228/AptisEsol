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
 public record DiscountRequest(@NotBlank @Pattern(regexp="[A-Za-z0-9_-]{2,40}") String code,@NotBlank String type,@NotNull @Min(1) Integer value,@NotNull Instant startsAt,@NotNull Instant endsAt,boolean active) {}
 @GetMapping public ApiResponse<List<DiscountCode>> list(){return ApiResponse.ok(codes.findAll(org.springframework.data.domain.Sort.by("id").descending()));}
 @PostMapping @Transactional public ApiResponse<DiscountCode> create(@Valid @RequestBody DiscountRequest r){return save(new DiscountCode(),r);}
 @PutMapping("/{id}") @Transactional public ApiResponse<DiscountCode> update(@PathVariable Long id,@Valid @RequestBody DiscountRequest r){return save(codes.findById(id).orElseThrow(()->new IllegalArgumentException("Không tìm thấy mã.")),r);}
 private ApiResponse<DiscountCode> save(DiscountCode item,DiscountRequest r){
  if(!List.of("PERCENT","FIXED").contains(r.type()) || ("PERCENT".equals(r.type()) && r.value()>99)) throw new IllegalArgumentException("Phần trăm phải từ 1 đến 99.");
  if(!r.endsAt().isAfter(r.startsAt())) throw new IllegalArgumentException("Ngày kết thúc phải sau ngày bắt đầu.");
  String code=DiscountService.normalize(r.code());
  if(code.startsWith("REF")) throw new IllegalArgumentException("Tiền tố REF dành cho mã giới thiệu.");
  codes.findByCode(code).ifPresent(existing->{if(!existing.getId().equals(item.getId())) throw new IllegalArgumentException("Mã giảm giá đã tồn tại.");});
  item.setCode(code);item.setType(r.type());item.setValue(r.value());item.setStartsAt(r.startsAt());item.setEndsAt(r.endsAt());item.setActive(r.active());
  return ApiResponse.ok(codes.save(item));
 }
}