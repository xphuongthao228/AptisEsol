package com.example.aptis.service;
import com.example.aptis.entity.*;
import com.example.aptis.repository.*;
import org.junit.jupiter.api.Test;
import java.time.*;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class ProGiftTest {
 @Test void extendsProAndPreventsReuseAndPaymentDiscount(){
 var codes=mock(DiscountCodeRepository.class);var users=mock(UserRepository.class);var redemptions=mock(DiscountRedemptionRepository.class);
 var service=new DiscountService(codes,users,redemptions);
 var user=new User();user.setId(1L);user.setEmail("test@example.com");var expiry=LocalDateTime.now().plusDays(10);user.setProExpiresAt(expiry);
 var code=new DiscountCode();code.setId(2L);code.setCode("PRO1DAY");code.setType("PRO_DAYS");code.setValue(1);code.setActive(true);code.setStartsAt(Instant.now().minusSeconds(60));code.setEndsAt(Instant.now().plusSeconds(3600));
 when(users.findByEmailAndDeletedAtIsNull(user.getEmail())).thenReturn(Optional.of(user));when(users.findByIdForUpdate(1L)).thenReturn(Optional.of(user));when(codes.findByCode("PRO1DAY")).thenReturn(Optional.of(code));
 assertEquals(expiry.plusDays(1),service.redeem(user.getEmail()," pro1day ").expiresAt());verify(redemptions).saveAndFlush(any());
 when(redemptions.existsByUserIdAndDiscountId(1L,2L)).thenReturn(true);
 assertThrows(IllegalArgumentException.class,()->service.redeem(user.getEmail(),"PRO1DAY"));
 assertThrows(IllegalArgumentException.class,()->service.quote(7,"PRO1DAY"));
 code.setActive(false);assertThrows(IllegalArgumentException.class,()->service.redeem(user.getEmail(),"PRO1DAY"));
 }
}
