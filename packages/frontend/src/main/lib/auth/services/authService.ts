import { LocalStorageKeys } from '@/helpers/mainConstants'
import { Nullable } from '@/helpers/typeHelpers'
import { getCurrentQueryParams } from '@/main/lib/common/web-apis/helpers/urlHelper'
import { AppLocalStorage } from '@/utils/localStorage'
import { Route } from 'vue-router'

/**
 * Process a successful authentication (from login page, registration page or elsewhere)
 */
export function processSuccessfulAuth(res: Response): void {
  // Redirect status means that auth was successful
  if (!res.redirected) return

  // If we already have a preferred redirect URL, use that instead, but take the access_code
  // from the incoming redirect URL
  let redirectUrl = undefined
  const clientSideRedirectPath = AppLocalStorage.get(LocalStorageKeys.ShouldRedirectTo)
  if (clientSideRedirectPath) {
    const accessCode = new URL(res.url).searchParams.get('access_code')
    if (accessCode) {
      const newUrl = new URL(clientSideRedirectPath, location.origin)
      newUrl.searchParams.set('access_code', accessCode)
      redirectUrl = newUrl.toString()
    }
  }

  // Fallback to default redirect url
  if (!redirectUrl) {
    redirectUrl = res.url
  }

  window.location.href = redirectUrl
}

/**
 * Get invite id from URL query string
 */
export function getInviteTokenFromURL(): Nullable<string> {
  const query = getCurrentQueryParams()
  return query.get('token') || query.get('inviteId')
}

/**
 * Get invite id from VueRouter route, can be used instead of getInviteTokenFromURL()
 * when you want the result to be reactive and dependant on the route object
 */
export function getInviteTokenFromRoute(route: Route): Nullable<string> {
  const query = route.query
  return (query.token as string) || (query.inviteId as string) || null
}
