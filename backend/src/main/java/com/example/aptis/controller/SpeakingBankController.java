package com.example.aptis.controller;

import com.example.aptis.repository.WritingBankEntryRepository;
import com.example.aptis.service.PaymentService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/speaking-bank")
public class SpeakingBankController extends WritingBankController {
    public SpeakingBankController(WritingBankEntryRepository repository, PaymentService paymentService) {
        super(repository, paymentService);
    }

    @Override
    protected String normalizeBankType(String bankType) {
        // Share the import format while keeping Speaking and Writing data separate.
        return "speaking-" + super.normalizeBankType(bankType);
    }
}
