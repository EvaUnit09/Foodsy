package com.foodsy.dto;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.deser.std.StdDeserializer;

import java.io.IOException;

/**
 * Handles Google Places API fields that are returned as nested objects instead of plain strings.
 *
 * generativeSummary: { "overview": { "text": "...", "languageCode": "en" } }
 * reviewSummary:     { "text": "..." }
 *
 * This deserializer extracts the text content from either shape, and also passes through
 * a plain JSON string unchanged (for mock/test data).
 */
public class SummaryTextDeserializer extends StdDeserializer<String> {

    public SummaryTextDeserializer() {
        super(String.class);
    }

    @Override
    public String deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
        JsonNode node = p.getCodec().readTree(p);

        // Plain string (mock data or already-extracted value)
        if (node.isTextual()) {
            return node.asText();
        }

        // generativeSummary shape: { "overview": { "text": "..." } }
        JsonNode overview = node.path("overview");
        if (!overview.isMissingNode()) {
            JsonNode text = overview.path("text");
            if (text.isTextual()) return text.asText();
        }

        // reviewSummary shape: { "text": "..." }
        JsonNode text = node.path("text");
        if (text.isTextual()) return text.asText();

        return null;
    }
}
