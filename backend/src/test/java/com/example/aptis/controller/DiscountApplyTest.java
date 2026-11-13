package com.example.aptis.controller;

import com.example.aptis.entity.DiscountCode;
import com.example.aptis.repository.DiscountCodeRepository;
import com.example.aptis.service.DiscountService;
import com.example.aptis.service.PaymentService;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import java.time.LocalDateTime;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class DiscountApplyTest {
    private final DiscountCodeRepository codes = mock(DiscountCodeRepository.class);
    private final DiscountService discounts = mock(DiscountService.class);
    private final PaymentService payments = mock(PaymentService.class);
    private final DiscountController controller = new DiscountController(codes, discounts, payments);
    private final UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken("student", "");

    @Test
    void giftActivatesWithoutRequiringPaidPackageOrCreatingPayment() {
        var code = new DiscountCode(); code.setType("PRO_DAYS");
        when(codes.findByCode("PRO1DAY")).thenReturn(Optional.of(code));
        var gift = new DiscountService.Redeemed("PRO1DAY", 1, LocalDateTime.now().plusDays(1));
        when(discounts.redeem("student", "PRO1DAY")).thenReturn(gift);
        var result = controller.apply(auth, new DiscountController.ApplyRequest(" pro1day ", 0)).data();
        assertEquals("PRO_DAYS", result.type());
        assertEquals(gift, result.gift());
        assertNull(result.quote());
        verifyNoInteractions(payments);
    }

    @Test
    void discountAndReferralKeepUsingTheExistingQuoteValidation() {
        for (String code : new String[]{"SALE10", "REFABC"}) {
            var quote = new DiscountService.Quote(140000, 14000, 126000, code);
            when(payments.quote("student", 30, code)).thenReturn(quote);
            var result = controller.apply(auth, new DiscountController.ApplyRequest(code.toLowerCase(), 30)).data();
            assertEquals("PAYMENT", result.type());
            assertEquals(quote, result.quote());
            assertNull(result.gift());
        }
        verifyNoInteractions(discounts);
    }

    @Test
    void usedOrExpiredGiftNeverFallsBackToPayment() {
        var code = new DiscountCode(); code.setType("PRO_DAYS");
        when(codes.findByCode("USED")).thenReturn(Optional.of(code));
        when(discounts.redeem("student", "USED")).thenThrow(new IllegalArgumentException("Already used"));
        assertThrows(IllegalArgumentException.class, () -> controller.apply(auth, new DiscountController.ApplyRequest("USED", 30)));
        verifyNoInteractions(payments);
    }

    @Test
    void paymentCodesNeedPaidPackageAndInvalidCodesPropagateValidationError() {
        assertThrows(IllegalArgumentException.class, () -> controller.apply(auth, new DiscountController.ApplyRequest("SALE10", 0)));
        verifyNoInteractions(payments);
        when(payments.quote("student", 30, "INVALID")).thenThrow(new IllegalArgumentException("Invalid code"));
        assertThrows(IllegalArgumentException.class, () -> controller.apply(auth, new DiscountController.ApplyRequest("INVALID", 30)));
        verifyNoInteractions(discounts);
    }
}
