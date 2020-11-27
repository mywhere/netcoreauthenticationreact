import React from 'react'
import { Component } from 'react';
import authService, { AuthenticationResult } from './AuthorizeService';
import { AuthenticationResultStatus } from './AuthorizeService';
import { LoginActions, QueryParameterNames, ApplicationPaths } from './ApiAuthorizationConstants';

// The main responsibility of this component is to handle the user's login process.
// This is the starting point for the login process. Any component that needs to authenticate
// a user can simply perform a redirect to this component with a returnUrl query parameter and
// let the component perform the login and return back to the return url.

export interface LoginProps {
    action: LoginActions;
}

interface LoginState {
    message: string | null | undefined;
}

export class Login extends Component<LoginProps, LoginState> {
    constructor(props: LoginProps) {
        super(props);

        this.state = {
            message: undefined
        };
    }

    public componentDidMount(): void {
        const action = this.props.action;
        switch (action) {
            case LoginActions.Login:
                this._login(this._getReturnUrl());
                break;
            case LoginActions.LoginCallback:
                this._processLoginCallback();
                break;
            case LoginActions.LoginFailed:
                const params = new URLSearchParams(window.location.search);
                const error = params.get(QueryParameterNames.Message);
                this.setState({ message: error });
                break;
            case LoginActions.Profile:
                this._redirectToProfile();
                break;
            case LoginActions.Register:
                this._redirectToRegister();
                break;
            default:
                throw new Error(`Invalid action '${action}'`);
        }
    }

    public render(): JSX.Element {
        const { action } = this.props;
        const { message } = this.state;

        if (!!message) {
            return (<div>{message}</div>);
        } else {
            switch (action) {
                case LoginActions.Login:
                    return (<div>Processing login</div>);
                case LoginActions.LoginCallback:
                    return (<div>Processing login callback</div>);
                case LoginActions.Profile:
                case LoginActions.Register:
                    return (<div></div>);
                default:
                    throw new Error(`Invalid action '${action}'`);
            }
        }
    }

    private async _login(returnUrl: string): Promise<void> {
        const state = { returnUrl };
        const result = await authService.signIn(state);
        switch (result.status) {
            case AuthenticationResultStatus.Redirect:
                break;
            case AuthenticationResultStatus.Success:
                await this._navigateToReturnUrl(returnUrl);
                break;
            case AuthenticationResultStatus.Fail:
                this.setState({ message: result.message });
                break;
            default:
                throw new Error(`Invalid status result ${result.status}.`);
        }
    }

    private async _processLoginCallback(): Promise<void> {
        const url = window.location.href;
        const result: AuthenticationResult = await authService.completeSignIn(url);
        switch (result.status) {
            case AuthenticationResultStatus.Redirect:
                // There should not be any redirects as the only time completeSignIn finishes
                // is when we are doing a redirect sign in flow.
                throw new Error('Should not redirect.');
            case AuthenticationResultStatus.Success:
                await this._navigateToReturnUrl(this._getReturnUrl(result.state));
                break;
            case AuthenticationResultStatus.Fail:
                this.setState({ message: result.message });
                break;
            default:
                throw new Error(`Invalid authentication result status '${result.status}'.`);
        }
    }

    private _getReturnUrl(state?: any): string {
        const params = new URLSearchParams(window.location.search);
        const fromQuery = params.get(QueryParameterNames.ReturnUrl);
        if (fromQuery && !fromQuery.startsWith(`${window.location.origin}/`)) {
            // This is an extra check to prevent open redirects.
            throw new Error("Invalid return url. The return url needs to have the same origin as the current page.")
        }
        return (state && state.returnUrl) || fromQuery || `${window.location.origin}/`;
    }

    private _redirectToRegister(): void {
        this._redirectToApiAuthorizationPath(`${ApplicationPaths.IdentityRegisterPath}?${QueryParameterNames.ReturnUrl}=${encodeURI(ApplicationPaths.Login)}`);
    }

    private _redirectToProfile(): void {
        this._redirectToApiAuthorizationPath(ApplicationPaths.IdentityManagePath);
    }

    private _redirectToApiAuthorizationPath(apiAuthorizationPath: string): void {
        const redirectUrl = `${window.location.origin}/${apiAuthorizationPath}`;
        // It's important that we do a replace here so that when the user hits the back arrow on the
        // browser they get sent back to where it was on the app instead of to an endpoint on this
        // component.
        window.location.replace(redirectUrl);
    }

    private _navigateToReturnUrl(returnUrl: string): void {
        // It's important that we do a replace here so that we remove the callback uri with the
        // fragment containing the tokens from the browser history.
        window.location.replace(returnUrl);
    }
}
