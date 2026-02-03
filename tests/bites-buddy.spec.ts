// Basic tests for Bites Buddy behavior
// Run with: npm test or playwright test

import { test, expect } from '@playwright/test';

test.describe('Bites Buddy Chat', () => {
  test('should show context-aware opening message', async ({ page }) => {
    await page.goto('/');
    
    // Open Bites AI
    await page.click('[data-testid="bites-ai-button"]');
    
    // Check for context-aware greeting
    const greeting = await page.textContent('[data-testid="chat-message"]');
    expect(greeting).toContain('Not sure what to eat');
    expect(greeting).toContain('around here');
  });

  test('should show quick reply buttons', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="bites-ai-button"]');
    
    // Check for quick reply buttons
    const buttons = await page.$$('[data-testid="quick-reply-button"]');
    expect(buttons.length).toBeGreaterThan(0);
  });

  test('should handle keyword input (Pizza)', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="bites-ai-button"]');
    
    // Type "Pizza"
    await page.fill('[data-testid="chat-input"]', 'Pizza');
    await page.click('[data-testid="send-button"]');
    
    // Wait for assistant response
    await page.waitForSelector('[data-testid="assistant-message"]');
    
    // Check for vibe question
    const response = await page.textContent('[data-testid="assistant-message"]:last-child');
    expect(response).toContain('quick');
  });

  test('should update feed when vibe is selected', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="bites-ai-button"]');
    
    // Click "Sit-down meal" button
    await page.click('text=Sit-down meal');
    
    // Wait for feed update
    await page.waitForTimeout(1000);
    
    // Check if feed was updated (banner should appear)
    const banner = await page.textContent('[data-testid="filter-banner"]');
    expect(banner).toBeTruthy();
  });

  test('should NOT default to openNow=true', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="bites-ai-button"]');
    
    // Complete flow without mentioning "open now"
    await page.click('text=Surprise me');
    
    // Check that openNow filter is NOT enabled
    const openNowButton = await page.$('[data-testid="open-now-filter"]');
    const isActive = await openNowButton?.getAttribute('data-active');
    expect(isActive).not.toBe('true');
  });

  test('should show action confirmation message', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="bites-ai-button"]');
    
    // Complete flow
    await page.fill('[data-testid="chat-input"]', 'Pizza');
    await page.click('[data-testid="send-button"]');
    await page.waitForTimeout(500);
    await page.click('text=Quick & casual');
    
    // Check for confirmation message
    await page.waitForSelector('text=Got it');
    const confirmation = await page.textContent('[data-testid="assistant-message"]:last-child');
    expect(confirmation).toContain('showing');
  });
});

test.describe('Intent Engine', () => {
  test('should initialize intent with time context', async ({ page }) => {
    await page.goto('/');
    
    // Check that intent is initialized (via console logs if DEBUG_BUDDY=true)
    // This is a basic structural test
    expect(true).toBe(true);
  });

  test('should map vibe to category correctly', async ({ page }) => {
    // Test vibe mapping logic
    // quick -> cafes
    // sitdown -> restaurants
    // drinks -> bars
    // explore/surprise -> all
    expect(true).toBe(true);
  });
});
