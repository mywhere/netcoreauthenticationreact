import React from 'react'
import { Component } from 'react'
import { Route, Redirect, RouteComponentProps } from 'react-router-dom'
import { ApplicationPaths, QueryParameterNames } from './ApiAuthorizationConstants'
import authService from './AuthorizeService'

export interface AuthorizeRouteProps {
    path: string;
    component: React.ComponentType<RouteComponentProps<any>> | React.ComponentType<any>;
}

interface AuthorizeRouteState {
    ready?: boolean;
    authenticated?: boolean;
}

export class AuthorizeRoute extends Component<AuthorizeRouteProps, AuthorizeRouteState> {
    private _subscription!: number;

    public constructor(props: AuthorizeRouteProps) {
        super(props);

        this.state = {
            ready: false,
            authenticated: false
        };
    }

    public componentDidMount(): void {
        this._subscription = authService.subscribe(() => this._authenticationChanged());
        this._populateAuthenticationState();
    }

    public componentWillUnmount(): void {
        authService.unsubscribe(this._subscription);
    }

    public render(): JSX.Element {
        const { ready, authenticated } = this.state;
        const { path } = this.props;

        var link = document.createElement("a");
        link.href = path;
        const returnUrl = `${link.protocol}//${link.host}${link.pathname}${link.search}${link.hash}`;
        const redirectUrl = `${ApplicationPaths.Login}?${QueryParameterNames.ReturnUrl}=${encodeURIComponent(returnUrl)}`
        if (!ready) {
            return (<div></div>);
        } else {
            const { component: Component, ...rest } = this.props;
            return (
                <Route {...rest}
                    render={(props) => {
                        if (authenticated) {
                            return (<Component {...props} />);
                        } else {
                            return (<Redirect to={redirectUrl} />);
                        }
                    }} />
            );
        }
    }

    private async _populateAuthenticationState(): Promise<void> {
        const authenticated = await authService.isAuthenticated();
        this.setState({ ready: true, authenticated });
    }

    private async _authenticationChanged(): Promise<void> {
        this.setState({ ready: false, authenticated: false });
        await this._populateAuthenticationState();
    }
}
