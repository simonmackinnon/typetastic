import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  type ISignUpResult,
} from 'amazon-cognito-identity-js';
import type { User } from '../types';

const poolData = {
  UserPoolId: process.env.COGNITO_USER_POOL_ID ?? '',
  ClientId:   process.env.COGNITO_CLIENT_ID ?? '',
};

const userPool = new CognitoUserPool(poolData);

function cognitoUser(email: string): CognitoUser {
  return new CognitoUser({ Username: email, Pool: userPool });
}

export async function signUp(email: string, password: string): Promise<ISignUpResult> {
  return new Promise((resolve, reject) => {
    userPool.signUp(
      email,
      password,
      [new CognitoUserAttribute({ Name: 'email', Value: email })],
      [],
      (err, result) => (err ? reject(err) : resolve(result!)),
    );
  });
}

export async function confirmSignUp(email: string, code: string): Promise<void> {
  return new Promise((resolve, reject) => {
    cognitoUser(email).confirmRegistration(code, true, (err) =>
      err ? reject(err) : resolve(),
    );
  });
}

export async function signIn(email: string, password: string): Promise<User> {
  return new Promise((resolve, reject) => {
    cognitoUser(email).authenticateUser(
      new AuthenticationDetails({ Username: email, Password: password }),
      {
        onSuccess: (session) => {
          const payload = session.getIdToken().decodePayload();
          resolve({ sub: payload['sub'], email: payload['email'] });
        },
        onFailure: reject,
      },
    );
  });
}

export async function signOut(): Promise<void> {
  const user = userPool.getCurrentUser();
  if (user) user.signOut();
}

export async function getCurrentUser(): Promise<User | null> {
  return new Promise((resolve) => {
    const user = userPool.getCurrentUser();
    if (!user) return resolve(null);

    user.getSession((err: Error | null, session: { isValid: () => boolean } | null) => {
      if (err || !session?.isValid()) return resolve(null);
      user.getUserAttributes((attrErr, attrs) => {
        if (attrErr || !attrs) return resolve(null);
        const get = (name: string) => attrs.find((a) => a.getName() === name)?.getValue() ?? '';
        resolve({ sub: get('sub'), email: get('email') });
      });
    });
  });
}

export async function getIdToken(): Promise<string | null> {
  return new Promise((resolve) => {
    const user = userPool.getCurrentUser();
    if (!user) return resolve(null);
    user.getSession((err: Error | null, session: { isValid: () => boolean; getIdToken: () => { getJwtToken: () => string } } | null) => {
      if (err || !session?.isValid()) return resolve(null);
      resolve(session.getIdToken().getJwtToken());
    });
  });
}
