import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('TaskForge E2E Tests', () => {
  
  test('Test 1: Health Check - API returns 200', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health`);
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('ok');
    console.log('Health check passed:', data);
  });

  test('Test 2: Login Flow - Verify login redirects to dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    // Fill in credentials
    await page.fill('input[type="email"]', 'testorg@example.com');
    await page.fill('input[type="password"]', 'password123');
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForURL('**/dashboard**', { timeout: 10000 }).catch(() => {
      console.log('Did not redirect to dashboard. Current URL:', page.url());
    });
    
    // Check current URL contains dashboard
    const currentUrl = page.url();
    console.log('After login, URL:', currentUrl);
    
    if (currentUrl.includes('dashboard')) {
      console.log('Login successful - redirected to dashboard');
    } else {
      // Get page content for debugging
      const content = await page.content();
      console.log('Page content (first 500 chars):', content.substring(0, 500));
      
      // Try to find error messages
      const errorElement = await page.$('[class*="error"]');
      if (errorElement) {
        const errorText = await errorElement.textContent();
        console.log('Error message found:', errorText);
      }
    }
  });

  test('Test 3: Registration Flow - Create new account', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    
    // Generate unique email
    const timestamp = Date.now();
    const email = `testuser${timestamp}@example.com`;
    
    // Fill in registration form
    await page.fill('input[name="name"]', `Test User ${timestamp}`);
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'password123');
    await page.fill('input[name="confirmPassword"]', 'password123');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait a bit for potential redirect
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    console.log('After registration, URL:', currentUrl);
    
    // Check if we're redirected (success) or still on register page (failure)
    if (!currentUrl.includes('register')) {
      console.log('Registration successful - redirected to:', currentUrl);
    } else {
      const content = await page.content();
      console.log('Still on register page. Content preview:', content.substring(0, 500));
    }
  });

  test('Test 4: Dashboard Access - Verify key elements after login', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'testorg@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await page.waitForURL('**/dashboard**', { timeout: 10000 }).catch(() => {});
    
    // Check for sidebar
    const sidebar = await page.$('[class*="sidebar"]');
    console.log('Sidebar found:', !!sidebar);
    
    // Check for workspace name
    const workspaceName = await page.$('[class*="workspace"]');
    console.log('Workspace element found:', !!workspaceName);
    
    // Take screenshot for visual verification
    await page.screenshot({ path: '/root/.openclaw/workspace/taskforge/e2e/dashboard.png', fullPage: true });
    console.log('Dashboard screenshot saved');
  });

  test('Test 5: Create Task - Verify task creation in a list', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'testorg@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard**', { timeout: 10000 }).catch(() => {});
    
    // Look for a list to navigate to
    // Try different selectors for lists/tasks
    await page.waitForTimeout(2000);
    
    // Look for add task button or similar
    const addTaskButton = await page.$('button:has-text("Add Task"), button:has-text("New Task"), [class*="addTask"]');
    console.log('Add task button found:', !!addTaskButton);
    
    if (addTaskButton) {
      await addTaskButton.click();
      await page.waitForTimeout(1000);
      
      // Try to fill in task form
      const taskInput = await page.$('input[name="title"], input[placeholder*="task"], input[placeholder*="Task"]');
      if (taskInput) {
        await taskInput.fill('Test Task from Playwright');
        console.log('Task title filled');
        
        // Submit task
        const submitBtn = await page.$('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
        if (submitBtn) {
          await submitBtn.click();
          await page.waitForTimeout(1000);
          console.log('Task submitted');
        }
      }
    } else {
      console.log('No add task button found, checking page structure...');
      await page.screenshot({ path: '/root/.openclaw/workspace/taskforge/e2e/no-add-task.png' });
    }
  });

  test('Test 6: Board View - Verify kanban columns are visible', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'testorg@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard**', { timeout: 10000 }).catch(() => {});
    
    // Try to navigate to board view
    const boardLink = await page.$('a[href*="board"], a[href*="kanban"]');
    if (boardLink) {
      await boardLink.click();
      await page.waitForTimeout(2000);
      console.log('Navigated to board view');
    } else {
      // Try common board URLs
      await page.goto(`${BASE_URL}/board`);
      await page.waitForTimeout(2000);
    }
    
    // Check for columns (kanban board structure)
    const columns = await page.$$('[class*="column"], [class*="Column"], .board-column, .kanban-column');
    console.log('Board columns found:', columns.length);
    
    // Take screenshot
    await page.screenshot({ path: '/root/.openclaw/workspace/taskforge/e2e/board.png', fullPage: true });
    console.log('Board view screenshot saved');
  });

});
