import { UserInfo, LoginType, ApiResponse } from '../types';
import { GameConfig } from '../config/GameConfig';

export class UserService {
  private static instance: UserService;
  private currentUser: UserInfo | null = null;
  private token: string | null = null;

  private constructor() {
    this.loadUserFromStorage();
  }

  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  // 从本地存储加载用户信息
  private loadUserFromStorage(): void {
    const token = localStorage.getItem(GameConfig.STORAGE_KEYS.USER_TOKEN);
    const userStr = localStorage.getItem(GameConfig.STORAGE_KEYS.USER_INFO);

    if (token && userStr) {
      try {
        this.token = token;
        this.currentUser = JSON.parse(userStr);
      } catch (error) {
        console.error('Failed to load user from storage:', error);
        this.clearUserData();
      }
    }
  }

  // 保存用户信息到本地存储
  private saveUserToStorage(): void {
    if (this.token && this.currentUser) {
      localStorage.setItem(GameConfig.STORAGE_KEYS.USER_TOKEN, this.token);
      localStorage.setItem(GameConfig.STORAGE_KEYS.USER_INFO, JSON.stringify(this.currentUser));
    }
  }

  // 清除用户数据
  private clearUserData(): void {
    this.currentUser = null;
    this.token = null;
    localStorage.removeItem(GameConfig.STORAGE_KEYS.USER_TOKEN);
    localStorage.removeItem(GameConfig.STORAGE_KEYS.USER_INFO);
  }

  // 游客登录
  async loginAsGuest(): Promise<ApiResponse<UserInfo>> {
    debugger
    try {
      // 模拟API请求
      const mockUser: UserInfo = {
        id: `guest_${Date.now()}`,
        nickname: `游客${Math.floor(Math.random() * 10000)}`,
        avatar: `avatar_${Math.floor(Math.random() * 10) + 1}`,
        level: 1,
        experience: 0,
        chips: 10000, // 新手赠送10000筹码
        diamonds: 100, // 新手赠送100钻石
        vipLevel: 0,
        createTime: Date.now(),
        lastLoginTime: Date.now(),
      };

      this.currentUser = mockUser;
      this.token = `guest_token_${Date.now()}`;
      this.saveUserToStorage();

      return {
        code: 200,
        message: '登录成功',
        data: mockUser,
      };
    } catch (error) {
      return {
        code: 500,
        message: '登录失败',
        data: null as unknown as UserInfo,
      };
    }
  }

  // 手机号登录
  async loginWithPhone(_phone: string, _code: string): Promise<ApiResponse<UserInfo | null>> {
    // TODO: 实现手机登录逻辑
    return {
      code: 400,
      message: '手机登录功能尚未实现',
      data: null,
    };
  }

  // 第三方登录
  async loginWithThirdParty(_type: LoginType): Promise<ApiResponse<UserInfo | null>> {
    // TODO: 实现第三方登录逻辑
    return {
      code: 400,
      message: '第三方登录功能尚未实现',
      data: null,
    };
  }

  // 登出
  logout(): void {
    this.clearUserData();
  }

  // 获取当前用户信息
  getCurrentUser(): UserInfo | null {
    return this.currentUser;
  }

  // 获取Token
  getToken(): string | null {
    return this.token;
  }

  // 是否已登录
  isLoggedIn(): boolean {
    return this.currentUser !== null && this.token !== null;
  }

  // 更新用户信息
  updateUserInfo(updates: Partial<UserInfo>): void {
    if (this.currentUser) {
      this.currentUser = { ...this.currentUser, ...updates };
      this.saveUserToStorage();
    }
  }

  // 更新筹码数量
  updateChips(amount: number): void {
    if (this.currentUser) {
      this.currentUser.chips += amount;
      this.saveUserToStorage();
    }
  }

  // 更新钻石数量
  updateDiamonds(amount: number): void {
    if (this.currentUser) {
      this.currentUser.diamonds += amount;
      this.saveUserToStorage();
    }
  }
} 