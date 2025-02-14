import { type Page, expect, test } from '@playwright/test'

const expectUserTableColumnInAccountsTableVisibility = async (
  page: Page,
  visibility: 'visible' | 'hidden',
) => {
  const accountsTable = page.getByRole('button', {
    name: 'accounts table',
    exact: true,
  })
  const userNameColumn = accountsTable.getByText('username')

  if (visibility === 'visible') {
    await expect(userNameColumn).toBeVisible()
  } else {
    await expect(userNameColumn).not.toBeVisible()
  }
}

test.describe('Navigation and URL Parameters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test.describe('Basic URL Parameters', () => {
    test('showMode changes should be reflected in URL', async ({ page }) => {
      const showModeButton = page.getByRole('button', { name: 'Show Mode' })
      await showModeButton.click()

      const tableNameOption = page.getByRole('menuitemradio', {
        name: 'All Fields',
      })
      await tableNameOption.click()

      await expect(page).toHaveURL(/.*showMode=ALL_FIELDS/)
      await expectUserTableColumnInAccountsTableVisibility(page, 'visible')
    })

    test.skip('selecting a table should update active parameter', async () => {})
    test.skip('hiding a table should update hidden parameter', async () => {})
  })

  test.describe('Browser History', () => {
    test('should handle back/forward navigation with showMode changes', async ({
      page,
    }) => {
      // Initial state
      const showModeButton = page.getByRole('button', { name: 'Show Mode' })

      // Change to ALL_FIELDS
      await showModeButton.click()
      const tableNameOption = page.getByRole('menuitemradio', {
        name: 'All Fields',
      })
      await tableNameOption.click()
      await expect(page).toHaveURL(/.*showMode=ALL_FIELDS/)

      // Change to KEY_ONLY
      await showModeButton.click()
      const keyOnlyOption = page.getByRole('menuitemradio', {
        name: 'Key Only',
      })
      await keyOnlyOption.click()
      await expect(page).toHaveURL(/.*showMode=KEY_ONLY/)
      await expectUserTableColumnInAccountsTableVisibility(page, 'hidden')

      // Go back
      await page.goBack()
      await expect(page).toHaveURL(/.*showMode=ALL_FIELDS/)
      await expectUserTableColumnInAccountsTableVisibility(page, 'visible')

      // Go forward
      await page.goForward()
      await expect(page).toHaveURL(/.*showMode=KEY_ONLY/)
      await expectUserTableColumnInAccountsTableVisibility(page, 'hidden')
    })

    test.skip('should handle back/forward navigation with table selection and hiding', async () => {})
  })

  test.describe('Parameter Combinations', () => {
    test.skip('should handle showMode change while table is selected', async () => {})

    test.skip('should handle hiding selected table', async () => {})
  })
})
