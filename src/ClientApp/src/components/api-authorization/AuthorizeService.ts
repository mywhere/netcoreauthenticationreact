import { User, UserManager, WebStorageStateStore } from 'oidc-client';
import { ApplicationPaths, ApplicationName } from './ApiAuthorizationConstants';

export interface AuthorizationCallback {
    callback: () => void;
    subscription: number;
}

export enum AuthenticationResultStatus {
    Redirect = 'redirect',
    Success = 'success',
    Fail = 'fail'
}

export interface AuthenticationResult {
    status: AuthenticationResultStatus;
    message?: string;
    state?: any;
}

export class AuthorizeService {
    private _callbacks: AuthorizationCallback[] = [];
    private _nextSubscriptionId = 0;
    private _user: User | undefined;
    private _userManager!: UserManager;

    // By default pop ups are disabled because they don't work properly on Edge.
    // If you want to enable pop up authentication simply set this flag to false.
    private _popUpDisabled = true;

    public async isAuthenticated(): Promise<boolean> {
        const user = await this.getUser();
        return !!user;
    }

    public async getUser(): Promise<any | null> {
        if (!!this._user && !!this._user.profile) {
            return this._user.profile;
        }

        await this._ensureUserManagerInitialized();
        const user = await this._userManager.getUser();
        if (!!user)
        {
            return user.profile;
        }

        return null;
    }

    public async getAccessToken(): Promise<string | undefined> {
        await this._ensureUserManagerInitialized();
        const user = await this._userManager.getUser();
        if (!!user) {
            return user.access_token;
        }
        return undefined;
    }

    // We try to authenticate the user in three different ways:
    // 1) We try to see if we can authenticate the user silently. This happens
    //    when the user is already logged in on the IdP and is done using a hidden iframe
    //    on the client.
    // 2) We try to authenticate the user using a PopUp Window. This might fail if there is a
    //    Pop-Up blocker or the user has disabled PopUps.
    // 3) If the two methods above fail, we redirect the browser to the IdP to perform a traditional
    //    redirect flow.
    public async signIn(state: any) {
        await this._ensureUserManagerInitialized();
        try {
            const silentUser = await this._userManager.signinSilent(this._createArguments());
            this._updateState(silentUser);
            return this._success(state);
        } catch (silentError) {
            // User might not be authenticated, fallback to popup authentication
            console.log("Silent authentication error: ", silentError);

            try {
                if (this._popUpDisabled) {
                    throw new Error('Popup disabled. Change \'AuthorizeService.js:AuthorizeService._popupDisabled\' to false to enable it.')
                }

                const popUpUser = await this._userManager.signinPopup(this._createArguments());
                this._updateState(popUpUser);
                return this._success(state);
            } catch (popUpError) {
                if (popUpError.message === "Popup window closed") {
                    // The user explicitly cancelled the login action by closing an opened popup.
                    return this._error("The user closed the window.");
                } else if (!this._popUpDisabled) {
                    console.log("Popup authentication error: ", popUpError);
                }

                // PopUps might be blocked by the user, fallback to redirect
                try {
                    await this._userManager.signinRedirect(this._createArguments(state));
                    return this._redirect();
                } catch (redirectError) {
                    console.log("Redirect authentication error: ", redirectError);
                    return this._error(redirectError);
                }
            }
        }
    }

    public async completeSignIn(url: string): Promise<AuthenticationResult> {
        try {
            await this._ensureUserManagerInitialized();
            const user = await this._userManager.signinCallback(url);
            this._updateState(user);
            return this._success(user && user.state);
        } catch (error) {
            return this._error('There was an error signing in.');
        }
    }

    // We try to sign out the user in two different ways:
    // 1) We try to do a sign-out using a PopUp Window. This might fail if there is a
    //    Pop-Up blocker or the user has disabled PopUps.
    // 2) If the method above fails, we redirect the browser to the IdP to perform a traditional
    //    post logout redirect flow.
    public async signOut(state: any): Promise<AuthenticationResult> {
        await this._ensureUserManagerInitialized();
        try {
            if (this._popUpDisabled) {
                throw new Error('Popup disabled. Change \'AuthorizeService.js:AuthorizeService._popupDisabled\' to false to enable it.')
            }

            await this._userManager.signoutPopup(this._createArguments());
            this._updateState(undefined);
            return this._success(state);
        } catch (popupSignOutError) {
            console.log("Popup signout error: ", popupSignOutError);
            try {
                await this._userManager.signoutRedirect(this._createArguments(state));
                return this._redirect();
            } catch (redirectSignOutError) {
                console.log("Redirect signout error: ", redirectSignOutError);
                return this._error(redirectSignOutError);
            }
        }
    }

    public async completeSignOut(url: string): Promise<AuthenticationResult> {
        await this._ensureUserManagerInitialized();
        try {
            const response = await this._userManager.signoutCallback(url);
            this._updateState(undefined);
            return this._success(response && response.data);
        } catch (error) {
            console.log(`There was an error trying to log out '${error}'.`);
            return this._error(error);
        }
    }

    public subscribe(callback: () => void): number {
        this._callbacks.push({ callback, subscription: this._nextSubscriptionId++ });
        return this._nextSubscriptionId - 1;
    }

    public unsubscribe(subscriptionId: number): void {
        const subscriptionIndex = this._callbacks
            .map((element, index) => element.subscription === subscriptionId ? { found: true, index } : { found: false, index: -1 })
            .filter(element => element.found === true);
        if (subscriptionIndex.length !== 1) {
            throw new Error(`Found an invalid number of subscriptions ${subscriptionIndex.length}`);
        }

        this._callbacks.splice(subscriptionIndex[0].index, 1);
    }

    private _updateState(user?: User): void {
        this._user = user;
        this._notifySubscribers();
    }

    private _notifySubscribers(): void {
        for (const item of this._callbacks) {
            const callback = item.callback; 
            callback();
        }
    }

    private _createArguments(state?: any): any {
        return { useReplaceToNavigate: true, data: state };
    }

    private _error(message: string): AuthenticationResult {
        return { status: AuthenticationResultStatus.Fail, message };
    }

    private _success(state?: any): AuthenticationResult {
        return { status: AuthenticationResultStatus.Success, state };
    }

    private _redirect(): AuthenticationResult {
        return { status: AuthenticationResultStatus.Redirect };
    }

    private async _ensureUserManagerInitialized() {
        if (this._userManager !== undefined) {
            return;
        }

        const response = await fetch(ApplicationPaths.ApiAuthorizationClientConfigurationUrl);
        if (!response.ok) {
            throw new Error(`Could not load settings for '${ApplicationName}'`);
        }

        let settings = await response.json();
        settings.automaticSilentRenew = true;
        settings.includeIdTokenInSilentRenew = true;
        settings.userStore = new WebStorageStateStore({
            prefix: ApplicationName
        });

        this._userManager = new UserManager(settings);

        this._userManager.events.addUserSignedOut(async () => {
            await this._userManager.removeUser();
            this._updateState(undefined);
        });
    }

    public static get instance() { return authService }
}

const authService = new AuthorizeService();

export default authService;

