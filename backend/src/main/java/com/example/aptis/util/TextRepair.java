package com.example.aptis.util;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;

public final class TextRepair {
    private static final Pattern SUSPICIOUS = Pattern.compile("[ÃÄÅÆÂâ�]|á[º»]");
    private static final Map<Integer, Byte> CP1252_REVERSE = new HashMap<>();

    static {
        CP1252_REVERSE.put(0x20ac, (byte) 0x80);
        CP1252_REVERSE.put(0x201a, (byte) 0x82);
        CP1252_REVERSE.put(0x0192, (byte) 0x83);
        CP1252_REVERSE.put(0x201e, (byte) 0x84);
        CP1252_REVERSE.put(0x2026, (byte) 0x85);
        CP1252_REVERSE.put(0x2020, (byte) 0x86);
        CP1252_REVERSE.put(0x2021, (byte) 0x87);
        CP1252_REVERSE.put(0x02c6, (byte) 0x88);
        CP1252_REVERSE.put(0x2030, (byte) 0x89);
        CP1252_REVERSE.put(0x0160, (byte) 0x8a);
        CP1252_REVERSE.put(0x2039, (byte) 0x8b);
        CP1252_REVERSE.put(0x0152, (byte) 0x8c);
        CP1252_REVERSE.put(0x017d, (byte) 0x8e);
        CP1252_REVERSE.put(0x2018, (byte) 0x91);
        CP1252_REVERSE.put(0x2019, (byte) 0x92);
        CP1252_REVERSE.put(0x201c, (byte) 0x93);
        CP1252_REVERSE.put(0x201d, (byte) 0x94);
        CP1252_REVERSE.put(0x2022, (byte) 0x95);
        CP1252_REVERSE.put(0x2013, (byte) 0x96);
        CP1252_REVERSE.put(0x2014, (byte) 0x97);
        CP1252_REVERSE.put(0x02dc, (byte) 0x98);
        CP1252_REVERSE.put(0x2122, (byte) 0x99);
        CP1252_REVERSE.put(0x0161, (byte) 0x9a);
        CP1252_REVERSE.put(0x203a, (byte) 0x9b);
        CP1252_REVERSE.put(0x0153, (byte) 0x9c);
        CP1252_REVERSE.put(0x017e, (byte) 0x9e);
        CP1252_REVERSE.put(0x0178, (byte) 0x9f);
    }

    private TextRepair() {
    }

    public static String repair(String value) {
        if (value == null || value.isBlank() || !SUSPICIOUS.matcher(value).find()) {
            return value;
        }

        String current = repairWhole(value);
        if (!SUSPICIOUS.matcher(current).find()) {
            return current;
        }

        return repairTokens(current);
    }

    private static String repairWhole(String value) {
        String current = value;
        for (int index = 0; index < 3; index += 1) {
            String next = decodeOnce(current);
            if (next.equals(current) || badScore(next) >= badScore(current)) {
                break;
            }
            current = next;
        }
        return current;
    }

    private static String repairTokens(String value) {
        StringBuilder repaired = new StringBuilder(value.length());
        StringBuilder token = new StringBuilder();

        for (int offset = 0; offset < value.length();) {
            int codePoint = value.codePointAt(offset);
            if (Character.isWhitespace(codePoint)) {
                appendRepairedToken(repaired, token);
                repaired.appendCodePoint(codePoint);
            } else {
                token.appendCodePoint(codePoint);
            }
            offset += Character.charCount(codePoint);
        }

        appendRepairedToken(repaired, token);
        return repaired.toString();
    }

    private static void appendRepairedToken(StringBuilder target, StringBuilder token) {
        if (token.isEmpty()) {
            return;
        }

        String value = token.toString();
        target.append(SUSPICIOUS.matcher(value).find() ? repairWhole(value) : value);
        token.setLength(0);
    }

    private static String decodeOnce(String value) {
        byte[] bytes = new byte[value.length() * 4];
        int byteCount = 0;
        for (int offset = 0; offset < value.length();) {
            int codePoint = value.codePointAt(offset);
            Integer mapped = toCp1252Byte(codePoint);
            if (mapped == null) {
                return value;
            }
            bytes[byteCount++] = mapped.byteValue();
            offset += Character.charCount(codePoint);
        }

        String decoded = new String(bytes, 0, byteCount, StandardCharsets.UTF_8);
        return decoded.contains("\uFFFD") ? value : decoded;
    }

    private static Integer toCp1252Byte(int codePoint) {
        if (codePoint <= 0xff) {
            return codePoint;
        }
        Byte mapped = CP1252_REVERSE.get(codePoint);
        return mapped == null ? null : Byte.toUnsignedInt(mapped);
    }

    private static int badScore(String value) {
        int score = 0;
        for (int offset = 0; offset < value.length();) {
            int codePoint = value.codePointAt(offset);
            if (codePoint == 0xfffd || codePoint == 'Ã' || codePoint == 'Ä'
                    || codePoint == 'Å' || codePoint == 'Æ' || codePoint == 'Â'
                    || codePoint == 'â' || codePoint == 'á') {
                score += 1;
            }
            offset += Character.charCount(codePoint);
        }
        return score;
    }
}
